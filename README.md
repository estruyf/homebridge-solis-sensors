# Homebridge Solis Sensors

This Homebridge plugin brings a couple of Solis sensors to the Homebridge platform.

- Battery level
- Solar panel power
- Net usage
- Current consumption

## Sample config

```json
{
  ...
  "platforms": [
    ...
    {
      "keyId": "key",
      "keySecret": "secret",
      "stationId": "station id",
      "platform": "SolisSensors",
      "batterySensor": true,
      "solarSensor": true,
      "netSensor": true,
      "loadSensor": true
    }
  ]
}
```