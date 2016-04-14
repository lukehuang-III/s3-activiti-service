(function (window, angular, undefined) {
  'use strict';

  angular.module('s3')
    .directive('s3GetWebBaseUrl', ['s3Config', 's3BpmService', function (s3Config, s3BpmService) {

      return {
        restrict: 'AE',
        link: function (scope, element, attrs) {
          // console.log($attrs);
          element.bind('click', function () {
            console.log(s3Config.getWebBaseUrl());
          });
        },
        controller: function ($scope, $element, $attrs) {
          // console.log($attrs);

        }
      }
    }])
    .directive('s3CreateBpmProcess', ['$state', 's3Config', 's3BpmService',
      function ($state, s3Config, s3BpmService) {
        return {
          restrict: 'AE',
          scope: {
            bpmParameters: '=pdata',
            needAccessToken: '=needAccessToken',
            success: '=successHandler',
            error: '=errorHandler'
          },
          link: function (scope, element, attrs) {

            element.bind('click', function () {

              var processDefinitionKey = attrs['s3CreateBpmProcess'];

              //var bpmParameters = '{}';

              if (scope.bpmParameters == null) {
                scope.bpmParameters = {};
              }

              if (scope.needAccessToken === true) {
                //
                //
              }


              scope.create(processDefinitionKey);
            });

          },
          controller: 's3CreateBpmProcessCtrl'
        };
      }])
    .controller('s3CreateBpmProcessCtrl', ['$scope', 's3BpmService', function ($scope, s3BpmService) {
      $scope.create = function (processDefinitionKey) {
        s3BpmService.S3BpmCreate(processDefinitionKey, $scope.bpmParameters, $scope.success, $scope.error, $scope.needAccessToken);
      };
    }])
    .directive('avaliableProcess', function () {

      return {
        restrict: 'E',
        templateUrl: 's3/template/avaliableProcessTemplate.html',
        controller: 'avaliableProcessCtrl'
      }
    })
    .controller('avaliableProcessCtrl', ['$scope', 's3BpmService', 's3Config', function ($scope, s3BpmService, s3Config) {

      $scope.processList = [];

      s3BpmService.S3BpmGetProcessDefinitionsByProjectId(s3Config.projectId)
        .then(function successCallback(response) {
          $scope.processList = response.data ? response.data : response;
        }, function errorCallback(error) {

        });

    }])
    .controller('s3SchemaFormController', ['$scope', 's3BpmService', '$q', '$stateParams','$state','s3Config', function ($scope, s3BpmService, $q,$stateParams, $state,s3Config) {

      var stringInArray = function (keyString, searchArray) {
        var isFound = false;
        for (var i = 0; i < searchArray.length; i++) {
          if (keyString === searchArray[i]) {
            isFound = true;
          }
        }
        return isFound;
      };

      function createFormSchema(object, keys, results) {

        if (object.type === 'object' && object.format === 'file') {
          var field1 = {};
          field1.key = keys;
          field1.type = 'file';
          results.push(field1);
        }
        else if (object.type === 'object') {

          // console.log(object.type);

          if (angular.isString(keys)) {
            var currentKey = keys.split('.');
            var field2 = {};
            field2.key = currentKey[currentKey.length - 1].split('[')[0];
            field2.items = [];
            angular.forEach(object.properties, function (value, key) {
              createFormSchema(value, keys + '.' + key, field2.items);
            });
            results.push(field2);
          }
          else {
            angular.forEach(object.properties, function (value, key) {
              createFormSchema(value, key, results);
            });
          }
        }
        else if (object.type === 'array') {
          createFormSchema(object.items, keys + '[]', results);
        }
        else {
          if (keys.substr(keys.length - 1) === ']') {

            results.push(keys.split('[')[0]);
          }
          else {
            results.push(keys);
          }
        }
      }

      var originalDataModel;

      $scope.submitData = function (dataModels) {
        $scope.onSubmit(dataModels);
      };

      var formReadonly = angular.isDefined($scope.jsfReadonly) ? $scope.jsfReadonly : [];
      //$scope.jsfOption = $scope.jsfOption ? $scope.jsfOption : {};

      $scope.jsfSchemaModels = [];
      $scope.jsfDataModels = {};

      //console.log('here');
      //console.log($scope.jsfData);

      var promiseList = [];
      angular.forEach($scope.jsfSchema, function (value, key) {
        var schemaModel = {};

        // console.log('value');
        // console.log(value);
        // console.log(key);
        // console.log('key');

        var deffered = $q.defer();

        JsonRefs.resolveRefs(value.schema, function (err, rJson) {
          if (err) throw err;
          schemaModel.schema = rJson;
          deffered.resolve(schemaModel);
        });
        var promise = deffered.promise;
        promiseList.push(promise);


        promise.then(function(schemaModel){



          schemaModel.title = value.title;
          if (!angular.isUndefined($scope.jsfModel) && $scope.jsfModel.hasOwnProperty(key)) {
            schemaModel.model = $scope.jsfModel[key];
            $scope.jsfDataModels[key] = $scope.jsfModel[key];
          }
          else {
            schemaModel.model = {};
            $scope.jsfDataModels[key] = {};
          }
          if (!angular.isUndefined($scope.jsfForm) && $scope.jsfForm.hasOwnProperty(key)) {
            schemaModel.form = $scope.jsfForm[key];
          }
          else {
            var createdFormSchema = [];
            //.log(schemaModel);
            //console.log(schemaModel.schema);
            createFormSchema(schemaModel.schema, null, createdFormSchema);

            //console.log('start');
            //console.log(schemaModel.schema);
            //console.log('start');

            if(!angular.isUndefined($scope.onSubmit)){
              createdFormSchema.push(
                {
                  'type': 'button',
                  'style': 'btn-info',
                  'icon': 'glyphicon glyphicon-ok',
                  'title': ' Submit',
                  'htmlClass': 'text-center',
                  'onClick': function () {


                    $scope.taskList = [];
                    $scope.taskId = "";



                    var pjid=s3Config.getProjectId();
                    var pcdf;
                    // console.log('stateParams');
                    // console.log($stateParams);
                    //  console.log('stateParams');

                    var json3,json4,json5,json6;

                    s3BpmService.S3BpmGetProcessDefinitionsByProjectId(pjid).then(function(res){

                      var errorHandle = function (error) {
                        console.log(error);
                        $state.go('common.main');
                      };

                      pcdf=res.data[1];

                      // console.log('stateParams');
                      //console.log(pjid);
                      //console.log();
                      // var queryParam = {
                      //   "processInstanceId": $stateParams
                      // };

                      // console.log('stateParams');
                      s3BpmService.S3BpmGetTaskListByProcessDefinitionKey(pcdf, $stateParams).then(function (response) {

                        //console.log('stateParams');
                        //console.log("res", response);
                        //console.log('stateParams');

                        $scope.taskId = response.data[0].id;
                        $scope.processInstanceId = response.data[0].processInstanceId;




                        $scope.onSubmit($scope.jsfSchemaModels);

                        //console.log($scope.jsfSchemaModels[0].schema.definitions);

                        for(key in $scope.jsfSchemaModels[0].schema.definitions){
                          json3=key;


                          // console.log(json3);

                        }



                        //console.log('response_for_u');
                        //console.log($scope.taskId);
                        // console.log($scope.processInstanceId);
                        //console.log($scope.jsfSchemaModels[0].model);
                        //console.log('response_for_u');


                        json5=JSON.stringify($scope.jsfSchemaModels[0].model);
                        //console.log(json5);

                        json4='{"'+json3+'":'+json5+'}';




                        json4=JSON.parse(json4);
                        //console.log(json4);


                        var data = {
                          "action": "complete",
                          "variables": json4
                        };


                        //console.log(data);


                        s3BpmService.S3BpmExecute($scope.processInstanceId, $scope.taskId, data, null, errorHandle);

                      });
                    });

                    //prdf2=prdf;




                    //     var testList = s3BpmService.S3BpmGetTaskListByProcessDefinitionKey(processDefinitionId02, queryParam).then(function (response) {
                    //       console.log("res", response);
                    /*
                     $scope.voucherList = response.data[0].widgetInput.value.input.vouchers;
                     // console.log("$scope.voucherList", $scope.voucherList);
                     $scope.taskId = response.data[0].id;
                     $scope.processInstanceId = response.data[0].processInstanceId;
                     response.data.forEach(function (object) {
                     $scope.taskList.push(object);
                     });
                     */
                    //      }



                    var processInstanceId;
                    var taskid;
                    // console.log('stateParams');




                    console.log($stateParams);




                    //  processInstanceId=$stateParams.params.processInstanceId;





                    //console.log('stateParams');

                    $scope.onSubmit($scope.jsfSchemaModels);
                    //console.log('response_for_u');

                    //var data = {
                    //  "action": "complete",
                    // "variables": {


                    //"story_author": "Lenis",
                    // "story_title": "spain",
                    // "story_content": "it was so fun",
                    // "amount": voucher.price,
                    // "transactionsObj":[{"amount":{"total":voucher.price,"currency":"TWD"},"description":voucher.name}],
                    // "redirect_urlObj":{
                    //   "return_url":"http://140.92.88.157:4019/#/confirm",
                    //   "cancel_url":"http://example.com/your_cancel_url.html"
                    // }
                    //   }
                    // };

                    //s3BpmService.S3BpmExecute($scope.processInstanceId, $scope.taskId, data, null, errorHandle);
                    //$state.go('common.main');
                  }
                }
              );
            }
            schemaModel.form = createdFormSchema;
          }
          if (stringInArray(key, formReadonly)) {
            schemaModel.option = {formDefaults: {readonly: true}};
          }
          else {
            schemaModel.option = {};
          }

          $scope.jsfSchemaModels.push(schemaModel);
        });



      });

      $q.all(promiseList).then(function(response){
        originalDataModel = angular.copy($scope.jsfDataModels);
      });

    }])
    .directive('s3SchemaForm', function () {
      return {
        scope: {
          jsfData: '=',
          jsfSchema: '=',
          jsfForm: '=',
          jsfModel: '=',
          jsfTitle: '@',
          jsfReadonly: '=',
          //jsfOption: '=',
          onSubmit: '=',
          panelStyle: '@'
        },
        restrict: 'E',
        templateUrl: 's3/template/s3SchemaFormTemplate.html',
        controller: 's3SchemaFormController'

      };
    });
})(window, window.angular);

angular.module("s3").run(["$templateCache", function($templateCache) {$templateCache.put("s3/template/avaliableProcessTemplate.html","<h2>Avaliable Process</h2>\r\n<ul ng-repeat=\"process in processList\">\r\n    <li><a s3-create-bpm-process=\"{{process.processDefinitionId}}\" user-token=\"true\" pdata=\"{}\">{{process.processDefinitionId}}</a></li>\r\n</ul>");
  $templateCache.put("s3/template/s3SchemaFormTemplate.html","<div class=\"panel\" ng-class=\"panelStyle || \'panel-default\'\">\r\n  <div class=\"panel-heading\" ng-if=\"jsfTitle\">\r\n    <h3 class=\"panel-title\">{{jsfTitle}}</h3>\r\n  </div>\r\n  <div class=\"panel-body\">\r\n    <div class=\"panel panel-info\" ng-repeat=\"jsfSchemaModel in jsfSchemaModels\">\r\n      <div class=\"panel-heading\" ng-if=\"jsfSchemaModel.title\">\r\n        <h3 class=\"panel-title\">{{jsfSchemaModel.title}}</h3>\r\n      </div>\r\n      <div class=\"panel-body\">\r\n        <form sf-schema=\"jsfSchemaModel.schema\" sf-form=\"jsfSchemaModel.form\" sf-model=\"jsfSchemaModel.model\" sf-options=\"jsfSchemaModel.option\" ng-submit=\"submitData(jsfDataModels)\"></form>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</div>\r\n\r\n");}]);
