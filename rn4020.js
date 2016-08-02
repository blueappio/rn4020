"use strict";

var rn4020 = function () {

    var TERM_SERVICE_UUID = "00035B03-58E6-07DD-021A-08123A000300";
    // rn kod 00035B03-58E6-07DD-021A-08123A000300
    // blue term 50270001-DF25-45B0-8AD9-B27CEBA6622F
    var WRITE_CHAR_UUID = "00035b03-58e6-07dd-021a-08123a000301";
    var NOTIFY_CHAR_UUID = "00035b03-58e6-07dd-021a-08123a000301";
    var CONFIG_CHAR_UUID = "00035b03-58e6-07dd-021a-08123a000301";

    // rn write notify uuid 00035b03-58e6-07dd-021a-08123a000301

    function rn4020(bluetooth) {
        this.connected = false;
        this.writeCharacteristic = undefined;
        this.configCharacteristic = undefined;
        this.configBuffer = undefined;
        this.bluetooth = bluetooth;
    }

    rn4020.prototype.connect = function connect() {

        var self = this;

        var options = {filters: [{services: [TERM_SERVICE_UUID]}]};

        return this.bluetooth.requestDevice(options)
            .then(function (device) {
                return device.gatt.connect();
            })
            .then(function (server) {
                return server.getPrimaryService(TERM_SERVICE_UUID)
            })
            .then(function restart(service) {
                return Promise.all([
  
                    service.getCharacteristic(WRITE_CHAR_UUID)
                        .then(function (characteristic) {
                            self.writeCharacteristic = characteristic;
                        }),
                    service.getCharacteristic(NOTIFY_CHAR_UUID)
                        .then(function (characteristic) {
                            return characteristic.startNotifications()
                                .then(function () {
                                    characteristic.addEventListener('characteristicvaluechanged', function (event) {
                                        //todo: generate event
                                        if (self.updateUI) {
                                            self.updateUI(event.target.value);
                                        }
                                    });
                                });
                        })
                ]);
            })
            .then(function () {
                self.connected = true;
            });
    };

    rn4020.prototype.writeConfigData = function writeConfigData(cfgData) {
        var self = this;

        if (this.configCharacteristic) {
            return this.configCharacteristic.writeValue(cfgData)
                .then(function () {
                    return self.configCharacteristic.readValue()
                        .then(function (value) {
                            self.configBuffer = value;
                            return Promise.resolve();
                        });
                });
        }
    }

    rn4020.prototype.writeCommand = function (strCommand) {
        if (this.writeCharacteristic) {
            return this.writeCharacteristic.writeValue(strCommand);
        }

        return Promise.reject();
    }

    return rn4020;

}();

if(window === undefined) {
    module.exports.rn4020 = rn4020;
}
