"use strict";

var app;
(function () {
    app = angular.module('rn4020', ['ngMaterial', 'ngMdIcons'])
        .config(function ($mdThemingProvider) {
            $mdThemingProvider.theme('default')
                .primaryPalette('blue')
                .accentPalette('blue-grey');
            $mdThemingProvider.theme('success-toast');
            $mdThemingProvider.theme('error-toast');
            $mdThemingProvider.alwaysWatchTheme(true);
        })
})();

app.run(['$document', '$window', function($document, $window) {
    var document = $document[0];
    document.addEventListener('click', function(event) {
        var hasFocus = document.hasFocus();
        if (!hasFocus) $window.focus();
    });
}]);

app.service('rn4020Service', function () {
    var term = new rn4020(navigator.bluetooth);
        console.log(term);
    return term;
});

app.controller('mainController', function ($scope, $mdToast, $mdDialog, rn4020Service) {

    $scope.rn4020 = rn4020Service;
    $scope.terminaldata = '';
    $scope.outputMessage = '';

    // Disabling the mouse right click event
    document.addEventListener('contextmenu', event => event.preventDefault());

    function goodToast(message) {
        $mdToast.show(
            $mdToast.simple()
                .textContent(message)
                .position('top')
                .theme("success-toast")
                .hideDelay(2500)
        );
    }

    function badToast(message) {
        $mdToast.show(
            $mdToast.simple()
                .textContent(message)
                .position('top')
                .theme('error-toast')
                .hideDelay(2500)
        );
    }

    function showLoadingIndicator($event, text) {
        var parentEl = angular.element(document.body);
        $mdDialog.show({
            parent: parentEl,
            targetEvent: $event,
            clickOutsideToClose: false,
            template: '<md-dialog style="width: 250px;top:95px;margin-top: -170px;" aria-label="loadingDialog" ng-cloak>' +
            '<md-dialog-content>' +
            '<div layout="row" layout-align="center" style="padding: 40px;">' +
                '<div style="padding-bottom: 20px;">' +
                    '<md-progress-circular md-mode="indeterminate" md-diameter="40" style="right: 20px;bottom: 10px;">' +
                    '</md-progress-circular>' +
                '</div>' +
            '</div>' +
            '<div layout="row" layout-align="center" style="padding-bottom: 20px;">' +
            '<label>' + text + '</label>' +
            '</div>' +
            '</md-dialog-content>' +
            '</md-dialog>',
            locals: {
                items: $scope.items
            },
            controller: DialogController
        });
        function DialogController($scope, $mdDialog, items) {
            $scope.items = items;
            $scope.closeDialog = function () {
                $mdDialog.hide();
            }
        }
    }

    function dismissLoadingIndicator() {
        $mdDialog.cancel();
    }


    
    $scope.rn4020.updateUI = function (value) {
        var tmpArray = new Uint8Array(value.buffer);
        var outputString = Utf8ArrayToStr(tmpArray);
        $scope.terminaldata = $scope.terminaldata + outputString;
        // console.log('citam '+$scope.outputMessage);
        $scope.$apply();
    };

    $scope.onClear = function () {
        $scope.terminaldata = '';
    };

    $scope.onSend = function () {
        if ($scope.inputData === undefined) {
            badToast('Enter Command to Send');
            return;
        }

        if ($scope.inputData === '') {
            badToast('Enter Command to Send');
            return;
        }

        var bytes = [];

        var command = "<="+$scope.inputData+"\r\n";
        bytes = stringToUintArray(command);


        var bufView = new Uint8Array(bytes);

        $scope.rn4020.writeCommand(bufView)
            .then(function () {
                $scope.terminaldata = $scope.terminaldata + ' <' + $scope.inputData + '> ';
                $scope.inputData = '';
                $scope.$apply();
            })
            .catch(function (error) {
                badToast('Unable to send data.');
            });
    };

    $scope.onConnect = function () {
        showLoadingIndicator('', 'Connecting ....');
        $scope.rn4020.connect()
            .then(function () {
                dismissLoadingIndicator();
                goodToast('Connected...');
            })
            .catch(function (error) {
                dismissLoadingIndicator();
                console.error('Argh!', error, error.stack ? error.stack : '');
                badToast('Unable to connect.');
            });
    };

    if (!navigator.bluetooth) {
        badToast('Bluetooth not supported, which is required.');
    } else if (navigator.bluetooth.referringDevice) {
        $scope.onConnect();
    }

});

app.filter('range', function () {
    return function (input, total) {
        total = parseInt(total);

        for (var i = 0; i < total; i++) {
            input.push(i);
        }

        return input;
    };
});



function stringToUintArray(str) {
    var charList = str.split('');
    var uintArray = [];
    for (var i = 0; i < charList.length; i++) {
        uintArray.push(charList[i].charCodeAt(0));
    }
    return uintArray;
}

function c(array, encoding) {
    return new Buffer(array).toString(encoding);
}

function Utf8ArrayToStr(array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
        c = array[i++];
        switch(c >> 4)
        {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
            case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }
    return out;
}
