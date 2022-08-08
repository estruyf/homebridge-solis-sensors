import { Service, PlatformAccessory, CharacteristicValue, Characteristic } from 'homebridge';
import { StationDetail } from '../model';
import { SolisSensorPlatform } from '../platform';
import { callApi } from '../utils/callApi';


export class SolisBatteryAccessory {
  private batterySensorService: Service;
  private solarSensorService: Service;
  private netSensorService: Service;
  private loadSensorService: Service;

  constructor(
    private readonly platform: SolisSensorPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Elio Struyf')
      .setCharacteristic(this.platform.Characteristic.Model, 'Battery Level')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'ES_BL_01');

    // Battery level
    this.batterySensorService = this.accessory.getService(this.platform.Service.Battery) || this.accessory.addService(this.platform.Service.Battery);
    this.batterySensorService.setCharacteristic(this.platform.Characteristic.Name, "Home battery");
    this.batterySensorService.setCharacteristic(this.platform.Characteristic.BatteryLevel, 0);
    this.batterySensorService.setCharacteristic(this.platform.Characteristic.StatusLowBattery, this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);

    // Power consumption
    this.solarSensorService = this.accessory.getService('Solar Panel Sensor') ||
    this.accessory.addService(this.platform.Service.LightSensor, 'Solar Panel Sensor', "db2b81f8-4d79-4cb4-992b-5071c0bc7892");
    this.solarSensorService.setCharacteristic(this.platform.Characteristic.Name, "Solar Panel");
    this.solarSensorService.setCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, 0.0001);

    this.netSensorService = this.accessory.getService('Net usage sensor') ||
    this.accessory.addService(this.platform.Service.LightSensor, 'Net usage sensor', "40aac825-7851-45ac-becc-1ccf77a75dbb");
    this.netSensorService.setCharacteristic(this.platform.Characteristic.Name, "Net usage");
    this.netSensorService.setCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, 0.0001);

    this.loadSensorService = this.accessory.getService('Usage Sensor') ||
    this.accessory.addService(this.platform.Service.LightSensor, 'Usage Sensor', "0f965642-adf4-40bf-a4fa-dd947c384cb5");
    this.loadSensorService.setCharacteristic(this.platform.Characteristic.Name, "Usage");
    this.loadSensorService.setCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, 0.0001);

    this.pollBatteryStatus();
  }

  async pollBatteryStatus() {
    const { keyId, keySecret, stationId } = this.getConfigData();

    if (!keyId || !keySecret || !stationId) {
      this.platform.log.error(`Missing keyId, keySecret, or stationId in config`);
      return;
    }
    
    const batteryData = await callApi<StationDetail>("/v1/api/stationDetail", {"id": stationId }, keyId, keySecret);

    if (batteryData) {
      this.platform.log.debug(`Battery Data`, batteryData);

      // Update the battery level characteristics
      this.batterySensorService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, batteryData.data.batteryPercent);

      if (batteryData.data.batteryPercent <= 25) {
        this.batterySensorService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
      } else {
        this.batterySensorService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery, this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      }

      if (batteryData.data.batteryChargeEnergy > 0) {
        this.batterySensorService.updateCharacteristic(this.platform.Characteristic.ChargingState, this.platform.Characteristic.ChargingState.CHARGING);
      } else {
        this.batterySensorService.updateCharacteristic(this.platform.Characteristic.ChargingState, this.platform.Characteristic.ChargingState.NOT_CHARGING);
      }

      // Update the other sensors
      this.solarSensorService.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, this.convertPowerNumber(batteryData.data.power));
      this.solarSensorService.updateCharacteristic(this.platform.Characteristic.Name, `Solar: ${(batteryData.data.porwerPercent*100).toFixed(2)}%`);

      this.netSensorService.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, this.convertPowerNumber(batteryData.data.psum));
      this.netSensorService.updateCharacteristic(this.platform.Characteristic.StatusActive, batteryData.data.psum > 0);
      this.netSensorService.updateCharacteristic(this.platform.Characteristic.Name, `Net: ${batteryData.data.psum.toFixed(3)}${batteryData.data.psumStr}`);

      const totalLoad = (batteryData.data.power-batteryData.data.psum);
      this.loadSensorService.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, this.convertPowerNumber(totalLoad));
      this.loadSensorService.updateCharacteristic(this.platform.Characteristic.Name, `Usage: ${totalLoad.toFixed(3)}${batteryData.data.psumStr}`);

    } else {
      this.platform.log.error(`No battery data found`);
    }

    // Run this again in a minute
    setTimeout(() => {
      this.pollBatteryStatus();
    }, 1 * 60 * 1000);
  }

  getConfigData() {
    const { keyId, keySecret, stationId } = this.platform.config;
    return { keyId, keySecret, stationId };
  }

  handleStatusLowBatteryGet() {
    // set this to a valid value for StatusLowBattery
    const currentValue = this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;

    return currentValue;
  }

  convertPowerNumber(value: number) {
    if (value <= 0) {
      return 0.0001;
    }

    return Math.abs(Math.round((value + Number.EPSILON) * 10) / 10)
  }
}