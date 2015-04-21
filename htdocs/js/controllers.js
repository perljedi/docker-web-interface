var dopplerStorageApp = angular.module('dopplerStorage', []);

dopplerStorageApp.controller('fociController', function ($scope, $http) {
  $scope.foci = [];
  $http.get('http://localhost:5000/focus').success(function(data) {
    $scope.foci = data.foci;
  });
  //$.getJSON("http://localhost:5000/focus", function(res){
  //  $scope.foci = res.foci
  //});
});