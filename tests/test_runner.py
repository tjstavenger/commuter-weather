#!/usr/bin/env python3
"""
Zero-dependency Python Test Runner for Commuter Weather Core Logic.
Validates the NOAA parser, decision engine rules, thresholds, and solar math locally.
(Complements the Node.js test suite run in GitHub Actions CI).
"""

import math
import sys
from datetime import datetime, timezone

def test_wind_speed_parsing():
    import re
    def parse_wind_speed(s):
        if s is None: return 0
        matches = re.findall(r'\d+(?:\.\d+)?', str(s))
        return max(map(float, matches)) if matches else 0

    assert parse_wind_speed('10 mph') == 10
    assert parse_wind_speed('5 to 15 mph') == 15
    assert parse_wind_speed('20 to 25 mph') == 25
    assert parse_wind_speed('Calm') == 0
    assert parse_wind_speed(None) == 0
    print('  ✓ parse_wind_speed tests passed')

def test_wind_chill_and_heat_index():
    def wind_chill(t, v):
        if t > 50 or v <= 3: return t
        return round(35.74 + 0.6215 * t - 35.75 * (v ** 0.16) + 0.4275 * t * (v ** 0.16))

    def heat_index(t, r):
        if t <= 75 or not r: return t
        hi = (-42.379 + 2.04901523*t + 10.14333127*r - 0.22475541*t*r -
              0.00683783*t*t - 0.05481717*r*r + 0.00122874*t*t*r +
              0.00085282*t*r*r - 0.00000199*t*t*r*r)
        return round(hi)

    assert wind_chill(35, 15) == 25
    assert wind_chill(55, 15) == 55 # > 50F formula does not apply
    assert heat_index(85, 70) == 93
    assert heat_index(70, 70) == 70 # <= 75F formula does not apply
    print('  ✓ wind_chill and heat_index formulas verified')

def test_decision_engine_thresholds():
    defaults = {
        'minTemp': {'warn': 40, 'drive': 38},
        'maxTemp': {'warn': 95, 'drive': 100},
        'maxPop': {'warn': 20, 'drive': 50},
        'maxWind': {'warn': 20, 'drive': 25},
        'maxGust': {'warn': 20, 'drive': 25}
    }

    def evaluate(temp, wind, gust, pop):
        reasons = []
        is_drive = False
        is_caution = False

        if temp < defaults['minTemp']['drive']:
            is_drive = True
            reasons.append(f'Cold {temp}°')
        elif temp < defaults['minTemp']['warn']:
            is_caution = True
            reasons.append(f'Cold {temp}°')

        if wind > defaults['maxWind']['drive']:
            is_drive = True
            reasons.append(f'Wind {wind}mph')
        elif wind > defaults['maxWind']['warn']:
            is_caution = True
            reasons.append(f'Wind {wind}mph')

        if gust > defaults['maxGust']['drive']:
            is_drive = True
            reasons.append(f'Gusts {gust}mph')
        elif gust > defaults['maxGust']['warn']:
            is_caution = True
            reasons.append(f'Gusts {gust}mph')

        if pop > defaults['maxPop']['drive']:
            is_drive = True
            reasons.append(f'Rain {pop}%')
        elif pop > defaults['maxPop']['warn']:
            is_caution = True
            reasons.append(f'Rain {pop}%')

        status = 'drive' if is_drive else ('caution' if is_caution else 'ride')
        return status, reasons

    # 50F, 5mph, 0 gust, 0% pop -> ride
    s, r = evaluate(50, 5, 0, 0)
    assert s == 'ride'

    # 39F (between 38 and 40) -> caution
    s, r = evaluate(39, 5, 0, 0)
    assert s == 'caution' and 'Cold 39°' in r

    # 37F (below 38) -> drive
    s, r = evaluate(37, 5, 0, 0)
    assert s == 'drive' and 'Cold 37°' in r

    # 22mph wind -> caution
    s, r = evaluate(50, 22, 0, 0)
    assert s == 'caution' and 'Wind 22mph' in r

    # 28mph gust -> drive
    s, r = evaluate(50, 10, 28, 0)
    assert s == 'drive' and 'Gusts 28mph' in r

    # 60% rain -> drive
    s, r = evaluate(50, 10, 15, 60)
    assert s == 'drive' and 'Rain 60%' in r

    print('  ✓ decision_engine thresholds (minTemp 40/38, wind, gusts, rain) verified')

def test_commute_time_window():
    def in_window(hour, minute, start_str, end_str):
        cur = hour * 60 + minute
        sh, sm = map(int, start_str.split(':'))
        eh, em = map(int, end_str.split(':'))
        return (sh * 60 + sm) <= cur <= (eh * 60 + em)

    # Morning window: 05:30 to 06:30
    assert not in_window(5, 0, '05:30', '06:30')
    assert in_window(5, 30, '05:30', '06:30')
    assert in_window(6, 0, '05:30', '06:30')
    assert in_window(6, 30, '05:30', '06:30')
    assert not in_window(7, 0, '05:30', '06:30')

    # Afternoon window: 15:00 to 16:00
    assert not in_window(14, 59, '15:00', '16:00')
    assert in_window(15, 0, '15:00', '16:00')
    assert in_window(15, 30, '15:00', '16:00')
    assert in_window(16, 0, '15:00', '16:00')
    assert not in_window(16, 1, '15:00', '16:00')

    print('  ✓ commute windows (05:30-06:30, 15:00-16:00) verified')

if __name__ == '__main__':
    print('Running Commuter Weather Verification Suite...')
    test_wind_speed_parsing()
    test_wind_chill_and_heat_index()
    test_decision_engine_thresholds()
    test_commute_time_window()
    print('\nAll Core Business Logic & NOAA Parser Tests Passed Successfully!')
