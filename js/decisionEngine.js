/**
 * Commuter Weather Decision Engine
 * Evaluates weather conditions against user-defined commute windows and thresholds.
 * Determines Ride, Caution, or Drive statuses with concise diagnostic reason chips.
 */

export const STATUS = {
  RIDE: 'ride',
  CAUTION: 'caution',
  DRIVE: 'drive'
};

/**
 * Calculates Wind Chill for cold weather (<= 50°F and wind > 3 mph)
 * Based on the National Weather Service formula.
 */
export function calculateWindChill(tempF, windMph) {
  if (tempF > 50 || windMph <= 3) return tempF;
  const v016 = Math.pow(windMph, 0.16);
  return Math.round(35.74 + 0.6215 * tempF - 35.75 * v016 + 0.4275 * tempF * v016);
}

/**
 * Calculates Heat Index for hot weather (> 75°F and relative humidity)
 * Based on the Rothfusz regression equation used by NWS.
 */
export function calculateHeatIndex(tempF, relHumidity) {
  if (tempF <= 75 || !relHumidity) return tempF;
  const t = tempF;
  const r = relHumidity;
  const hi = -42.379 +
    2.04901523 * t +
    10.14333127 * r -
    0.22475541 * t * r -
    0.00683783 * t * t -
    0.05481717 * r * r +
    0.00122874 * t * t * r +
    0.00085282 * t * r * r -
    0.00000199 * t * t * r * r;
  return Math.round(hi);
}

/**
 * Calculates Apparent Temperature (Wind Chill in cold wind, Heat Index in humid heat)
 */
export function calculateApparentTemperature(tempF, windMph, relHumidity) {
  if (tempF <= 50 && windMph > 3) {
    return calculateWindChill(tempF, windMph);
  }
  if (tempF > 75 && relHumidity) {
    return calculateHeatIndex(tempF, relHumidity);
  }
  return tempF;
}

/**
 * Parses time string (e.g. "05:30") into { hours, minutes }
 */
export function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return { hours: 0, minutes: 0 };
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: isNaN(h) ? 0 : h, minutes: isNaN(m) ? 0 : m };
}

/**
 * Checks if a Date object falls between startStr and endStr (HH:mm) on that day.
 * Inclusive of the hour and minutes.
 */
export function isTimeInWindow(date, startStr, endStr) {
  const start = parseTimeString(startStr);
  const end = parseTimeString(endStr);

  const hour = date.getHours();
  const minute = date.getMinutes();
  const currentMinutes = hour * 60 + minute;

  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Evaluates an individual hour against threshold options and sunrise/sunset.
 * @param {object} hour Hourly period object
 * @param {object} options User settings
 * @param {object} sun { sunrise: Date, sunset: Date }
 * @returns {object} { status: 'ride'|'caution'|'drive', reasons: string[], apparentTemp: number }
 */
export function evaluateHour(hour, options, sun) {
  const apparentTemp = calculateApparentTemperature(hour.temperature, hour.windSpeed, hour.relativeHumidity);
  const reasons = [];
  let isDrive = false;
  let isCaution = false;

  const time = hour.startTime;

  // 1. Min Temperature Threshold (Warn: default 40°F, Drive: default 38°F)
  if (options.minTemp?.enabled) {
    if (hour.temperature < options.minTemp.drive) {
      isDrive = true;
      reasons.push(`Cold ${hour.temperature}°`);
    } else if (hour.temperature < options.minTemp.warn) {
      isCaution = true;
      reasons.push(`Cold ${hour.temperature}°`);
    }
  }

  // 2. Max Temperature Threshold (Warn: default 95°F, Drive: default 100°F)
  if (options.maxTemp?.enabled) {
    if (hour.temperature > options.maxTemp.drive) {
      isDrive = true;
      reasons.push(`Heat ${hour.temperature}°`);
    } else if (hour.temperature > options.maxTemp.warn) {
      isCaution = true;
      reasons.push(`Heat ${hour.temperature}°`);
    }
  }

  // 3. Precipitation Probability Threshold (Warn: default 20%, Drive: default 50%)
  if (options.maxPop?.enabled && hour.pop !== undefined) {
    if (hour.pop > options.maxPop.drive) {
      isDrive = true;
      reasons.push(`Rain ${hour.pop}%`);
    } else if (hour.pop > options.maxPop.warn) {
      isCaution = true;
      reasons.push(`Rain ${hour.pop}%`);
    }
  }

  // 4. Wind Speed Threshold (Warn: default 20mph, Drive: default 25mph)
  if (options.maxWind?.enabled) {
    if (hour.windSpeed > options.maxWind.drive) {
      isDrive = true;
      reasons.push(`Wind ${hour.windSpeed}mph`);
    } else if (hour.windSpeed > options.maxWind.warn) {
      isCaution = true;
      reasons.push(`Wind ${hour.windSpeed}mph`);
    }
  }

  // 5. Wind Gust Threshold (Warn: default 20mph, Drive: default 25mph)
  if (options.maxGust?.enabled && hour.gustSpeed > 0) {
    if (hour.gustSpeed > options.maxGust.drive) {
      isDrive = true;
      reasons.push(`Gusts ${hour.gustSpeed}mph`);
    } else if (hour.gustSpeed > options.maxGust.warn) {
      isCaution = true;
      reasons.push(`Gusts ${hour.gustSpeed}mph`);
    }
  }

  // 6. Darkness Before Sunrise (Warn: default 75m, Drive: default 90m)
  if (options.beforeSunrise?.enabled && sun?.sunrise && time < sun.sunrise) {
    const diffMinutes = Math.round((sun.sunrise.getTime() - time.getTime()) / (60 * 1000));
    if (diffMinutes > options.beforeSunrise.drive) {
      isDrive = true;
      reasons.push(`Darkness`);
    } else if (diffMinutes > options.beforeSunrise.warn) {
      isCaution = true;
      reasons.push(`Darkness`);
    }
  }

  // 7. Darkness After Sunset (Warn: default 75m, Drive: default 90m)
  if (options.afterSunset?.enabled && sun?.sunset && time > sun.sunset) {
    const diffMinutes = Math.round((time.getTime() - sun.sunset.getTime()) / (60 * 1000));
    if (diffMinutes > options.afterSunset.drive) {
      isDrive = true;
      reasons.push(`Darkness`);
    } else if (diffMinutes > options.afterSunset.warn) {
      isCaution = true;
      reasons.push(`Darkness`);
    }
  }

  let status = STATUS.RIDE;
  if (isDrive) {
    status = STATUS.DRIVE;
  } else if (isCaution) {
    status = STATUS.CAUTION;
  }

  return {
    status,
    reasons: [...new Set(reasons)],
    apparentTemp
  };
}

function summarizeReasons(reasons) {
  const summarized = new Map();

  for (const reason of reasons) {
    const match = /^(Cold|Heat|Rain|Wind|Gusts) (-?\d+(?:\.\d+)?)(°|%|mph)$/.exec(reason);
    const key = match ? match[1] : reason;
    const value = match ? Number(match[2]) : null;
    const previous = summarized.get(key);
    const isMoreSevere = previous && value !== null
      && (key === 'Cold' ? value < previous.value : value > previous.value);

    if (!previous || isMoreSevere) {
      summarized.set(key, { reason, value });
    }
  }

  return [...summarized.values()].map(item => item.reason);
}

/**
 * Checks if a given Date is a standard weekday (Monday to Friday).
 */
export function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Evaluates a daily/12-hour period using associated hourly forecasts and user commute windows.
 * @param {object} period Daily period (from NOAA properties.periods)
 * @param {Array<object>} hourlyPeriods All hourly periods
 * @param {object} options User settings
 * @param {object} sun { sunrise: Date, sunset: Date }
 * @returns {object} Evaluated period with status, reasons, and matched hourly data
 */
export function evaluatePeriod(period, hourlyPeriods, options, sun) {
  const periodStart = period.startTime;
  const periodEnd = period.endTime;

  // Filter hourly forecasts that fall within this period
  const matchingHours = hourlyPeriods.filter(h => h.startTime >= periodStart && h.startTime < periodEnd);

  // Evaluate each hour
  const evaluatedHours = matchingHours.map(h => ({
    ...h,
    evaluation: evaluateHour(h, options, sun)
  }));

  // If night period or no commute windows active, reflect worst condition
  if (!period.isDaytime || !isWeekday(periodStart)) {
    let worstStatus = STATUS.RIDE;
    const allReasons = [];

    for (const h of evaluatedHours) {
      if (h.evaluation.status === STATUS.DRIVE) {
        worstStatus = STATUS.DRIVE;
        allReasons.push(...h.evaluation.reasons);
      } else if (h.evaluation.status === STATUS.CAUTION && worstStatus !== STATUS.DRIVE) {
        worstStatus = STATUS.CAUTION;
        allReasons.push(...h.evaluation.reasons);
      }
    }

    let ntMinTemp = Infinity, ntMaxTemp = -Infinity, ntMaxWind = 0, ntMaxWindDirection = '', ntMaxGust = 0;
    let ntMaxPop = -Infinity, ntMaxHumidity = -Infinity;
    for (const h of evaluatedHours) {
      if (h.temperature < ntMinTemp) ntMinTemp = h.temperature;
      if (h.temperature > ntMaxTemp) ntMaxTemp = h.temperature;
      if (h.windSpeed > ntMaxWind || (h.windSpeed === ntMaxWind && !ntMaxWindDirection && h.windDirection)) {
        ntMaxWind = h.windSpeed;
        ntMaxWindDirection = h.windDirection || '';
      }
      if ((h.gustSpeed || 0) > ntMaxGust) ntMaxGust = h.gustSpeed || 0;
      if (Number.isFinite(h.pop) && h.pop > ntMaxPop) ntMaxPop = h.pop;
      if (Number.isFinite(h.relativeHumidity) && h.relativeHumidity > ntMaxHumidity) ntMaxHumidity = h.relativeHumidity;
    }
    return {
      ...period,
      status: worstStatus,
      reasons: summarizeReasons(allReasons).slice(0, 3),
      hours: evaluatedHours,
      summary: {
        minTemp: isFinite(ntMinTemp) ? ntMinTemp : null,
        maxTemp: isFinite(ntMaxTemp) ? ntMaxTemp : null,
        maxWind: ntMaxWind,
        maxWindDirection: ntMaxWindDirection,
        maxGust: ntMaxGust,
        maxPop: isFinite(ntMaxPop) ? ntMaxPop : null,
        maxHumidity: isFinite(ntMaxHumidity) ? ntMaxHumidity : null
      }
    };
  }

  // Workday Daytime Period: Evaluate Commute Windows (Morning: 05:30-06:30, Afternoon: 15:00-16:00)
  const morningHours = [];
  const afternoonHours = [];
  const middayHours = [];

  const morningConfig = options.morningCommute || { enabled: true, start: '05:30', end: '06:30' };
  const afternoonConfig = options.afternoonCommute || { enabled: true, start: '15:00', end: '16:00' };

  for (const h of evaluatedHours) {
    const isMorning = morningConfig.enabled && isTimeInWindow(h.startTime, morningConfig.start, morningConfig.end);
    const isAfternoon = afternoonConfig.enabled && isTimeInWindow(h.startTime, afternoonConfig.start, afternoonConfig.end);

    if (isMorning) morningHours.push(h);
    if (isAfternoon) afternoonHours.push(h);

    // Midday between commute windows
    const timeMinutes = h.startTime.getHours() * 60 + h.startTime.getMinutes();
    const morningEndMin = parseTimeString(morningConfig.end).hours * 60 + parseTimeString(morningConfig.end).minutes;
    const afternoonStartMin = parseTimeString(afternoonConfig.start).hours * 60 + parseTimeString(afternoonConfig.start).minutes;

    if (timeMinutes > morningEndMin && timeMinutes < afternoonStartMin) {
      middayHours.push(h);
    }
  }

  let periodStatus = STATUS.RIDE;
  const periodReasons = [];

  // Check commute hours for DRIVE conditions
  const commuteHours = [...morningHours, ...afternoonHours];
  for (const h of commuteHours) {
    if (h.evaluation.status === STATUS.DRIVE) {
      periodStatus = STATUS.DRIVE;
      periodReasons.push(...h.evaluation.reasons);
    }
  }

  // If not drive, check commute hours for CAUTION conditions
  if (periodStatus !== STATUS.DRIVE) {
    for (const h of commuteHours) {
      if (h.evaluation.status === STATUS.CAUTION) {
        periodStatus = STATUS.CAUTION;
        periodReasons.push(...h.evaluation.reasons);
      }
    }
  }

  // If commute hours are favorable (RIDE), but midday weather is bad, warn with CAUTION
  if (periodStatus === STATUS.RIDE) {
    for (const h of middayHours) {
      if (h.evaluation.status === STATUS.DRIVE || h.evaluation.status === STATUS.CAUTION) {
        periodStatus = STATUS.CAUTION;
        periodReasons.push(...h.evaluation.reasons);
      }
    }
  }

  // Compute period-wide summary stats across ALL hours (not just commute)
  let periodMinTemp = Infinity;
  let periodMaxTemp = -Infinity;
  let periodMaxWind = 0;
  let periodMaxWindDirection = '';
  let periodMaxGust = 0;
  let periodMaxPop = -Infinity;
  let periodMaxHumidity = -Infinity;
  for (const h of evaluatedHours) {
    if (h.temperature < periodMinTemp) periodMinTemp = h.temperature;
    if (h.temperature > periodMaxTemp) periodMaxTemp = h.temperature;
    if (h.windSpeed > periodMaxWind || (h.windSpeed === periodMaxWind && !periodMaxWindDirection && h.windDirection)) {
      periodMaxWind = h.windSpeed;
      periodMaxWindDirection = h.windDirection || '';
    }
    if ((h.gustSpeed || 0) > periodMaxGust) periodMaxGust = h.gustSpeed || 0;
    if (Number.isFinite(h.pop) && h.pop > periodMaxPop) periodMaxPop = h.pop;
    if (Number.isFinite(h.relativeHumidity) && h.relativeHumidity > periodMaxHumidity) periodMaxHumidity = h.relativeHumidity;
  }

  return {
    ...period,
    status: periodStatus,
    reasons: summarizeReasons(periodReasons).slice(0, 3), // Keep top 3 concise reason chips to prevent UI clutter
    hours: evaluatedHours,
    commuteHours: {
      morning: morningHours,
      afternoon: afternoonHours
    },
    summary: {
      minTemp: isFinite(periodMinTemp) ? periodMinTemp : null,
      maxTemp: isFinite(periodMaxTemp) ? periodMaxTemp : null,
      maxWind: periodMaxWind,
      maxWindDirection: periodMaxWindDirection,
      maxGust: periodMaxGust,
      maxPop: isFinite(periodMaxPop) ? periodMaxPop : null,
      maxHumidity: isFinite(periodMaxHumidity) ? periodMaxHumidity : null
    }
  };
}
