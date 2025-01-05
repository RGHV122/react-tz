import React, { useState,useRef, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { timezoneList } from '../utils/timedata';        

export default function TimezoneConverter() {
  const [clocks, setClocks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [is24Hour, setIs24Hour] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [focusedClockId, setFocusedClockId] = useState(null);
  const filteredTimezonesRef = useRef(null); // Add ref for scrollable container

  useEffect(() => {
    if (filteredTimezonesRef.current) {
      filteredTimezonesRef.current.scrollTop = 0; // Scroll to top on searchQuery change
    }
  }, [searchQuery]);

  useEffect(() => {
    // Set first clock as focused when clocks array changes
    if (clocks.length > 0 && !focusedClockId) {
      setFocusedClockId(clocks[0].id);
    }
    // Clear focused clock if all clocks are removed
    if (clocks.length === 0) {
      setFocusedClockId(null);
    }
  }, [clocks.length]);

  const getTimeOffset = (focusedClock, currentClock) => {
    if (!focusedClock || focusedClock.id === currentClock.id) return null;
    
    const offsetMinutes = currentClock.dateTime.offset - focusedClock.dateTime.offset;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    
    let offsetString = '';
    if (hours > 0) offsetString += `${hours}h `;
    if (minutes > 0) offsetString += `${minutes}m`;
    if (!offsetString) return '±0h';
    
    return `${offsetMinutes >= 0 ? '+' : '-'}${offsetString}`;
  };

  const handleTimeBlur = (clockId, field) => {
    const clock = clocks.find(c => c.id === clockId);
    if (!clock) return;

    let updatedClock = { ...clock };
    
    if (field === 'hour' && !clock.isHourValid) {
      updatedClock.displayHour = clock.dateTime.toFormat(is24Hour ? 'HH' : 'hh');
      updatedClock.isHourValid = true;
    } else if (field === 'minute' && !clock.isMinuteValid) {
      updatedClock.displayMinute = clock.dateTime.toFormat('mm');
      updatedClock.isMinuteValid = true;
    }

    setClocks(prevClocks => 
      prevClocks.map(c => c.id === clockId ? updatedClock : c)
    );
  };

  const onSearchQueryChange = (value) => {
    setSearchQuery(value);
  };

  const getFilteredTimezones = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
  
    return timezoneList
      .map(tz => {
        // Calculate match scores based on multiple fields
        let score = 0;
        if (tz.abbreviations?.some(abbr => abbr.toLowerCase() == query)) score += 10000; // Match in abbreviations
        else if(tz.abbreviations?.some(abbr => abbr.toLowerCase().startsWith(query))) score+=4

        if (tz.value.toLowerCase().startsWith(query)) score += 10; // Match in countries
        else if (tz.value.toLowerCase().includes(query)) score += 3; // Match in display value

        // if (tz.key.toLowerCase().includes(query)) score += 2; // Match in timezone key

          
        return { ...tz, score };
      })
      .filter(tz => tz.score > 0) // Only include matching timezones
      .sort((a, b) => b.score - a.score || a.value - b.value); // Sort by score and alphabetically
  };
  const filteredTimezones = useMemo(()=> getFilteredTimezones());


  const addClock = (timezone) => {
    const dateTime = clocks.length === 0 
      ? DateTime.local().setZone(timezone.key)
      : clocks[0].dateTime.setZone(timezone.key);

    const newClock = {
      timezone,
      dateTime,
      id: crypto.randomUUID(),
      displayHour: dateTime.toFormat(is24Hour ? 'HH' : 'hh'),
      displayMinute: dateTime.toFormat('mm'),
      isHourValid: true,
      isMinuteValid: true
    };
    
    setClocks(prevClocks => [...prevClocks, newClock]);
    onSearchQueryChange('');
  };

  const updateAllClocks = (updatedClock) => {
    setClocks(prevClocks => 
      prevClocks.map(clock => {
        if (clock.id === updatedClock.id) return updatedClock;
        return {
          ...clock,
          dateTime: updatedClock.dateTime.setZone(clock.timezone.key),
          displayHour: updatedClock.dateTime.setZone(clock.timezone.key).toFormat(is24Hour ? 'HH' : 'hh'),
          displayMinute: updatedClock.dateTime.setZone(clock.timezone.key).toFormat('mm'),
          isHourValid: true,
          isMinuteValid: true
        };
      })
    );
  };

  const handleTimeChange = (clockId, field, value) => {
    const clock = clocks.find(c => c.id === clockId);
    if (!clock) return;

    let updatedClock = { ...clock };

    switch (field) {
      case 'hour': {
        updatedClock.displayHour = value;
        const isValid = !isInvalidInput('hour', value);
        updatedClock.isHourValid = isValid;
        
        if (isValid) {
          const parsedHour = parseInt(value);
          if (!is24Hour) {
            const isPM = clock.dateTime.hour >= 12;
            const hour24 = isPM ? ((parsedHour % 12) + 12) : (parsedHour % 12);
            updatedClock.dateTime = clock.dateTime.set({ hour: hour24 });
          } else {
            updatedClock.dateTime = clock.dateTime.set({ hour: parsedHour });
          }
        }
        break;
      }
      case 'minute': {
        updatedClock.displayMinute = value;
        const isValid = !isInvalidInput('minute', value);
        updatedClock.isMinuteValid = isValid;
        
        if (isValid) {
          updatedClock.dateTime = clock.dateTime.set({ minute: parseInt(value) });
        }
        break;
      }
      case 'date': {
        const [year, month, day] = value.split('-').map(Number);
        updatedClock.dateTime = clock.dateTime.set({ year, month, day });
        break;
      }
      case 'meridiem': {
        const currentHour = parseInt(updatedClock.displayHour);
        const newHour = value === 'PM' ? 
          (currentHour % 12) + 12 : 
          currentHour % 12;
        updatedClock.dateTime = clock.dateTime.set({ hour: newHour });
        updatedClock.displayHour = updatedClock.dateTime.toFormat('hh');
        break;
      }
    }

    if (field === 'date' || (updatedClock.isHourValid && updatedClock.isMinuteValid)) {
      updateAllClocks(updatedClock);
    } else {
      setClocks(prevClocks => 
        prevClocks.map(c => c.id === clockId ? updatedClock : c)
      );
    }
  };

  const isInvalidInput = (field, value) => {
    if (field === "hour") {
      const hour = parseInt(value);
      if (!value || !(/^\d+$/.test(value))) return true;
      if (is24Hour) {
        return hour < 0 || hour > 23;
      }
      return hour < 1 || hour > 12;
    }
    if (field === "minute") {
      const minute = parseInt(value);
      if (!value || !(/^\d+$/.test(value))) return true;
      return minute < 0 || minute > 59;
    }
    return false;
  };

  const getGMTOffset = (dateTime) => {
    const offsetMinutes = dateTime.offset;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    return `GMT${offsetMinutes >= 0 ? '+' : '-'}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const focusedClock = clocks.find(c => c.id === focusedClockId);

  return (
    <div className="p-6 min-h-screen bg-white dark:bg-gray-900 transition-colors">
     <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Timezone Easy</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setIs24Hour(!is24Hour)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {is24Hour ? '12-Hour' : '24-Hour'}
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
          >
            {isDarkMode ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>


	  <div className="relative mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search timezone..."
          className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:text-white"
        />
        {searchQuery && (
          <div
          ref={filteredTimezonesRef}
           className="absolute w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
            {filteredTimezones.map((tz, index) => (
              <div
                key={index}
                onClick={() => addClock(tz)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                {tz.offset} {tz.value}
              </div>
            ))}
          </div>
        )}
      </div>

	  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clocks.map(clock => (
          <div 
            key={clock.id} 
            className={`h-40 p-4 rounded-lg relative cursor-pointer transition-all bg-gray-100 dark:bg-gray-800 ${
              clock.id === focusedClockId
                ? 'ring-2 ring-blue-500'
                : ''
            }`}
            onClick={() => setFocusedClockId(clock.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newClocks = clocks.filter(cl => cl.id !== clock.id);
                setClocks(newClocks);
                if (clock.id === focusedClockId && newClocks.length > 0) {
                  setFocusedClockId(newClocks[0].id);
                }
              }}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            
            <div className="mb-3 text-center h-12">
              <div className="text-sm dark:text-white">
                {clock.timezone.value} ({getGMTOffset(clock.dateTime)})
              </div>
              {focusedClock && clock.id !== focusedClockId && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {getTimeOffset(focusedClock, clock)} from {focusedClock.timezone.value}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center space-x-1 font-mono">
              <input
                type="date"
                value={clock.dateTime.toFormat('yyyy-MM-dd')}
                onChange={(e) => handleTimeChange(clock.id, 'date', e.target.value)}
                className="h-9 px-2 text-center rounded border dark:bg-gray-700 dark:text-white text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={clock.displayHour}
                onChange={(e) => handleTimeChange(clock.id, 'hour', e.target.value)}
                onBlur={() => handleTimeBlur(clock.id, 'hour')}
                className={`h-9 w-12 px-2 text-center border rounded dark:bg-gray-700 dark:text-white focus:outline-none
                  ${!clock.isHourValid ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500'}`}
              />
              <span className="text-lg dark:text-white">:</span>
              <input
                type="text"
                value={clock.displayMinute}
                onChange={(e) => handleTimeChange(clock.id, 'minute', e.target.value)}
                onBlur={() => handleTimeBlur(clock.id, 'minute')}
                className={`h-9 w-12 px-2 text-center border rounded dark:bg-gray-700 dark:text-white focus:outline-none
                  ${!clock.isMinuteValid ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-gray-300 focus:ring-1 focus:ring-blue-500'}`}
              />
              {!is24Hour && (
                <select
                  value={clock.dateTime.toFormat('a')}
                  onChange={(e) => handleTimeChange(clock.id, 'meridiem', e.target.value)}
                  className="h-9 w-16 px-2 text-center rounded border dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      {clocks.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
          Search for a timezone to add a clock
        </div>
      )}
    </div>
  );
}