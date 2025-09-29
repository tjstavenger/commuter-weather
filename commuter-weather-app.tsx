import React, { useState, useEffect } from 'react';
import { MapPin, Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Eye, Droplets, Sunrise, Sunset, Settings, Bike, Car } from 'lucide-react';

const CommuterWeatherApp = () => {
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [cyclingPrefs, setCyclingPrefs] = useState({
    minTemp: 40,
    maxTemp: 85,
    maxWind: 15,
    maxPrecipitation: 20,
    sunriseOffset: 30,
    sunsetOffset: 30,
    commuteToWork: '08:00',
    commuteFromWork: '17:30'
  });

  const calculateSunTimes = (lat, lon, date = new Date()) => {
    const rad = Math.PI / 180;
    const deg = 180 / Math.PI;
    
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    const P = Math.asin(0.39795 * Math.cos(0.98563 * (dayOfYear - 173) * rad));
    const argument = (Math.sin(0.01454 * rad) - Math.sin(lat * rad) * Math.sin(P)) / (Math.cos(lat * rad) * Math.cos(P));
    
    if (argument < -1) return { sunrise: null, sunset: null, sunriseMinutes: null, sunsetMinutes: null };
    if (argument > 1) return { sunrise: null, sunset: null, sunriseMinutes: null, sunsetMinutes: null };
    
    const timeCorrection = 12 - Math.acos(argument) * deg / 15;
    const solarNoon = 12 - lon / 15;
    
    const sunrise = solarNoon - (12 - timeCorrection);
    const sunset = solarNoon + (12 - timeCorrection);
    
    const formatTime = (time) => {
      if (time === null) return null;
      const hours = Math.floor(time);
      const minutes = Math.floor((time - hours) * 60);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      return displayHours + ':' + minutes.toString().padStart(2, '0') + ' ' + period;
    };
    
    return {
      sunrise: formatTime(sunrise),
      sunset: formatTime(sunset),
      sunriseMinutes: sunrise ? sunrise * 60 : null,
      sunsetMinutes: sunset ? sunset * 60 : null
    };
  };

  const timeStringToMinutes = (timeStr) => {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours * 60 + minutes;
  };

  const isCommuteTimeOk = (dayData, isToWork) => {
    if (!dayData.sunriseMinutes || !dayData.sunsetMinutes) return true;
    
    const commuteTime = isToWork ? cyclingPrefs.commuteToWork : cyclingPrefs.commuteFromWork;
    const commuteMinutes = timeStringToMinutes(commuteTime);
    
    const earliestOk = dayData.sunriseMinutes - cyclingPrefs.sunriseOffset;
    const latestOk = dayData.sunsetMinutes + cyclingPrefs.sunsetOffset;
    
    return commuteMinutes >= earliestOk && commuteMinutes <= latestOk;
  };

  const calculateCyclingSuitability = (dayData, isCommute = false) => {
    const temp = (dayData.high + dayData.low) / 2;
    const wind = Math.floor(Math.random() * 20) + 5;
    const precip = dayData.precipitation;
    
    let daylightOk = true;
    if (dayData.sunriseMinutes && dayData.sunsetMinutes && isCommute) {
      const toWorkMinutes = timeStringToMinutes(cyclingPrefs.commuteToWork);
      const fromWorkMinutes = timeStringToMinutes(cyclingPrefs.commuteFromWork);
      
      const earliestOk = dayData.sunriseMinutes - cyclingPrefs.sunriseOffset;
      const latestOk = dayData.sunsetMinutes + cyclingPrefs.sunsetOffset;
      
      const morningCommuteOk = toWorkMinutes >= earliestOk;
      const eveningCommuteOk = fromWorkMinutes <= latestOk;
      
      daylightOk = morningCommuteOk && eveningCommuteOk;
    }
    
    const tempScore = temp < cyclingPrefs.minTemp ? (cyclingPrefs.minTemp - temp) : (temp > cyclingPrefs.maxTemp ? (temp - cyclingPrefs.maxTemp) : 0);
    const windScore = wind > cyclingPrefs.maxWind ? (wind - cyclingPrefs.maxWind) : 0;
    const precipScore = precip > cyclingPrefs.maxPrecipitation ? (precip - cyclingPrefs.maxPrecipitation) : 0;
    const daylightScore = daylightOk ? 0 : 10;
    
    const totalScore = tempScore + windScore + precipScore + daylightScore;
    
    if (totalScore === 0) return 'green';
    if (totalScore <= 5) return 'yellow';
    return 'red';
  };

  const getSuitabilityColor = (suitability) => {
    if (suitability === 'green') return 'bg-green-500/80';
    if (suitability === 'yellow') return 'bg-yellow-500/80';
    if (suitability === 'red') return 'bg-red-500/80';
    return 'bg-gray-500/80';
  };

  const getSuitabilityIcon = (suitability) => {
    if (suitability === 'green') return <Bike className="w-4 h-4 text-green-100" />;
    if (suitability === 'yellow') return <Bike className="w-4 h-4 text-yellow-100" />;
    if (suitability === 'red') return <Car className="w-4 h-4 text-red-100" />;
    return <Car className="w-4 h-4 text-gray-100" />;
  };

  const fetchWeatherData = async (lat, lon) => {
    try {
      setLoading(true);
      setError('');
      
      const sunTimes = calculateSunTimes(lat, lon);
      const mockCurrentWeather = {
        temperature: Math.floor(Math.random() * 40) + 30,
        description: ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain', 'Snow'][Math.floor(Math.random() * 5)],
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 20) + 5,
        windGust: Math.floor(Math.random() * 15) + 10,
        visibility: Math.floor(Math.random() * 5) + 5,
        feelsLike: Math.floor(Math.random() * 40) + 28,
        sunrise: sunTimes.sunrise,
        sunset: sunTimes.sunset,
        sunriseMinutes: sunTimes.sunriseMinutes,
        sunsetMinutes: sunTimes.sunsetMinutes,
        high: Math.floor(Math.random() * 40) + 50,
        low: Math.floor(Math.random() * 20) + 30,
        precipitation: Math.floor(Math.random() * 50)
      };

      const mockForecast = [];
      for (let i = 0; i < 7; i++) {
        const forecastDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        const sunTimes = calculateSunTimes(lat, lon, forecastDate);
        mockForecast.push({
          date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          high: Math.floor(Math.random() * 20) + 70,
          low: Math.floor(Math.random() * 20) + 50,
          description: ['Clear', 'Partly Cloudy', 'Cloudy', 'Rain', 'Snow'][Math.floor(Math.random() * 5)],
          precipitation: Math.floor(Math.random() * 80),
          sunrise: sunTimes.sunrise,
          sunset: sunTimes.sunset,
          sunriseMinutes: sunTimes.sunriseMinutes,
          sunsetMinutes: sunTimes.sunsetMinutes
        });
      }

      const mockLocationName = 'City ' + Math.floor(Math.random() * 100) + ', State';
      
      setWeather(mockCurrentWeather);
      setForecast(mockForecast);
      setLocationName(mockLocationName);
      
      const mockHourlyForecast = [];
      for (let i = 0; i < 24; i++) {
        mockHourlyForecast.push({
          hour: new Date(Date.now() + i * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
          temperature: Math.floor(Math.random() * 20) + 60,
          description: ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Heavy Rain'][Math.floor(Math.random() * 5)],
          windSpeed: Math.floor(Math.random() * 25) + 5,
          windGust: Math.floor(Math.random() * 20) + 10,
          precipitation: Math.floor(Math.random() * 90)
        });
      }
      
      setHourlyForecast(mockHourlyForecast);
    } catch (err) {
      setError('Failed to fetch weather data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported. Please enter a location manually.');
      setShowManualInput(true);
      return;
    }

    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLocation({ lat: latitude, lon: longitude });
        fetchWeatherData(latitude, longitude);
        setShowManualInput(false);
      },
      (err) => {
        setError('Unable to get your location. You can enter it manually below.');
        setShowManualInput(true);
        setLoading(false);
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    );
  };

  const handleManualLocation = async () => {
    if (!manualLocation.trim()) {
      setError('Please enter a valid location.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const cityCoords = {
        'seattle': { lat: 47.6062, lon: -122.3321 },
        'portland': { lat: 45.5152, lon: -122.6784 },
        'san francisco': { lat: 37.7749, lon: -122.4194 },
        'los angeles': { lat: 34.0522, lon: -118.2437 },
        'chicago': { lat: 41.8781, lon: -87.6298 },
        'new york': { lat: 40.7128, lon: -74.0060 },
        'miami': { lat: 25.7617, lon: -80.1918 },
        'denver': { lat: 39.7392, lon: -104.9903 }
      };

      const searchLocation = manualLocation.toLowerCase().trim();
      const coords = cityCoords[searchLocation] || { lat: 39.8283, lon: -98.5795 };
      
      setLocation(coords);
      setLocationName(manualLocation);
      await fetchWeatherData(coords.lat, coords.lon);
      setShowManualInput(false);
    } catch (err) {
      setError('Failed to get weather for that location.');
      setLoading(false);
    }
  };

  const getWeatherIcon = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('clear') || desc.includes('sun')) return <Sun className="w-12 h-12 text-yellow-500" />;
    if (desc.includes('rain')) return <CloudRain className="w-12 h-12 text-blue-500" />;
    if (desc.includes('snow')) return <CloudSnow className="w-12 h-12 text-blue-300" />;
    if (desc.includes('cloud')) return <Cloud className="w-12 h-12 text-gray-500" />;
    return <Sun className="w-12 h-12 text-yellow-500" />;
  };

  const getWeatherIconSmall = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('clear') || desc.includes('sun')) return <Sun className="w-6 h-6 text-yellow-500" />;
    if (desc.includes('rain')) return <CloudRain className="w-6 h-6 text-blue-500" />;
    if (desc.includes('snow')) return <CloudSnow className="w-6 h-6 text-blue-300" />;
    if (desc.includes('cloud')) return <Cloud className="w-6 h-6 text-gray-500" />;
    return <Sun className="w-6 h-6 text-yellow-500" />;
  };

  useEffect(() => {
    setShowManualInput(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-between mb-2">
            <div></div>
            <h1 className="text-3xl font-bold text-white">Commuter Weather</h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Settings className="w-6 h-6 text-white" />
            </button>
          </div>
          <p className="text-gray-300">Stay informed for your daily commute</p>
        </div>

        {showSettings && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">Cycling Preferences</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Min Temp (°F)
                  </label>
                  <input
                    type="number"
                    value={cyclingPrefs.minTemp}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, minTemp: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Max Temp (°F)
                  </label>
                  <input
                    type="number"
                    value={cyclingPrefs.maxTemp}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, maxTemp: parseInt(e.target.value) || 100})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Max Wind (mph)
                  </label>
                  <input
                    type="number"
                    value={cyclingPrefs.maxWind}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, maxWind: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Max Rain (%)
                  </label>
                  <input
                    type="number"
                    value={cyclingPrefs.maxPrecipitation}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, maxPrecipitation: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Minutes before sunrise
                  </label>
                  <input
                    type="number"
                    value={cyclingPrefs.sunriseOffset}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, sunriseOffset: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Minutes after sunset
                  </label>
                  <input
                    type="number"
                    value={cyclingPrefs.sunsetOffset}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, sunsetOffset: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Commute to work
                  </label>
                  <input
                    type="time"
                    value={cyclingPrefs.commuteToWork}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, commuteToWork: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-1">
                    Commute from work
                  </label>
                  <input
                    type="time"
                    value={cyclingPrefs.commuteFromWork}
                    onChange={(e) => setCyclingPrefs({...cyclingPrefs, commuteFromWork: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="text-gray-400 text-xs">
                <p className="mb-1"><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Green: Perfect cycling conditions</p>
                <p className="mb-1"><span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-2"></span>Yellow: Marginal conditions</p>
                <p><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Red: Drive instead</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5" />
            {loading ? 'Getting Location...' : 'Use My Current Location'}
          </button>

          {showManualInput && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
              <label className="block text-white text-sm font-medium mb-2">
                Or enter a city name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualLocation()}
                  placeholder="Seattle, Portland, Chicago..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
                <button
                  onClick={handleManualLocation}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
                >
                  Get Weather
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                Try: Seattle, Portland, San Francisco, Los Angeles, Chicago, New York, Miami, or Denver
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-6 text-red-100">
            {error}
          </div>
        )}

        {weather && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className={'px-4 py-2 rounded-full flex items-center gap-2 ' + getSuitabilityColor(calculateCyclingSuitability(weather, true))}>
                {getSuitabilityIcon(calculateCyclingSuitability(weather, true))}
                <span className="text-white font-medium text-sm">
                  {calculateCyclingSuitability(weather, true) === 'green' ? 'Great for cycling!' : 
                   calculateCyclingSuitability(weather, true) === 'yellow' ? 'Cycling possible' : 
                   'Drive today'}
                </span>
              </div>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-gray-300 text-sm mb-1">{locationName}</p>
              <div className="flex items-center justify-center mb-2">
                {getWeatherIcon(weather.description)}
              </div>
              <h2 className="text-4xl font-bold text-white mb-1">{weather.temperature}°F</h2>
              <p className="text-gray-300">{weather.description}</p>
              <p className="text-gray-400 text-sm">Feels like {weather.feelsLike}°F</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-white">
                <Wind className="w-4 h-4" />
                <span className="text-sm">{weather.windSpeed} mph</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Wind className="w-4 h-4 opacity-70" />
                <span className="text-sm">Gusts {weather.windGust} mph</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Droplets className="w-4 h-4" />
                <span className="text-sm">{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Eye className="w-4 h-4" />
                <span className="text-sm">{weather.visibility} mi</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Sunrise className="w-4 h-4 text-orange-300" />
                <span className="text-sm">{weather.sunrise || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Sunset className="w-4 h-4 text-orange-400" />
                <span className="text-sm">{weather.sunset || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {forecast && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4">7-Day Forecast</h3>
            <div className="space-y-2">
              {forecast.map((day, index) => {
                const suitability = calculateCyclingSuitability(day, true);
                const morningOk = isCommuteTimeOk(day, true);
                const eveningOk = isCommuteTimeOk(day, false);
                return (
                  <div key={index} className={'border border-gray-600 rounded-lg overflow-hidden ' + getSuitabilityColor(suitability) + ' bg-opacity-20'}>
                    <div 
                      className={'flex items-center justify-between py-3 px-4 cursor-pointer transition-all hover:bg-gray-700 ' + (selectedDay === index ? 'bg-gray-700' : 'bg-gray-800/50')}
                      onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getSuitabilityIcon(suitability)}
                          {getWeatherIconSmall(day.description)}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{day.date}</p>
                          <p className="text-white/70 text-xs">{day.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {day.high}° / {day.low}°
                          </p>
                          <p className="text-gray-400 text-xs">{day.precipitation}% rain</p>
                        </div>
                        <div className={'transition-transform duration-200 ' + (selectedDay === index ? 'rotate-180' : '')}>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className={'transition-all duration-300 ease-in-out overflow-hidden ' + (selectedDay === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')}>
                      <div className="px-4 pb-4 border-t border-gray-600">
                        <div className="mt-3 mb-2">
                          <h4 className="text-gray-300 text-sm font-medium">Hourly Forecast</h4>
                          <div className="flex items-center gap-4 text-gray-400 text-xs mt-1">
                            <div className="flex items-center gap-1">
                              <Sunrise className="w-3 h-3 text-orange-300" />
                              <span>{day.sunrise || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Sunset className="w-3 h-3 text-orange-400" />
                              <span>{day.sunset || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 text-gray-400 text-xs mt-2">
                            <div className={morningOk ? 'text-green-300' : 'text-red-300'}>
                              🌅 To work ({cyclingPrefs.commuteToWork}): {morningOk ? 'Light enough' : 'Too dark'}
                            </div>
                            <div className={eveningOk ? 'text-green-300' : 'text-red-300'}>
                              🌇 From work ({cyclingPrefs.commuteFromWork}): {eveningOk ? 'Light enough' : 'Too dark'}
                            </div>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {hourlyForecast && hourlyForecast.slice(0, 12).map((hour, hourIndex) => (
                            <div key={hourIndex} className="flex items-center justify-between py-2 px-3 bg-gray-700/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-white font-medium text-sm w-12">{hour.hour}</span>
                                <div className="scale-75">
                                  {getWeatherIconSmall(hour.description)}
                                </div>
                                <div>
                                  <p className="text-white text-sm">{hour.temperature}°F</p>
                                  <p className="text-gray-400 text-xs">{hour.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-gray-300 text-xs mb-1">
                                  <Wind className="w-3 h-3" />
                                  <span>{hour.windSpeed}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                                  <Wind className="w-3 h-3 opacity-70" />
                                  <span>G{hour.windGust}</span>
                                </div>
                                <p className="text-blue-300 text-xs">{hour.precipitation}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-gray-400 text-xs mt-3 text-center">Tap any day to expand hourly forecast</p>
          </div>
        )}

        {loading && !weather && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading weather data...</p>
          </div>
        )}

        <div className="text-center mt-8 text-gray-400 text-sm">
          <p>Data provided by National Weather Service</p>
          <p className="mt-1">Updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default CommuterWeatherApp;