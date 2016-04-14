(function (window, angular, undefined) {
  'use strict';


  angular.module('s3', ['ngResource', 'ui.router', 'ActivitiRest'])
    .provider('s3Config', [function () {

      this.apiBaseUrl = 'http://localhost:3000/activiti/';
      this.setApiBaseUrl = function (apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
      };
      this.getApiBaseUrl = function () {
        return this.apiBaseUrl;
      };

      this.webBaseUrl = window.location.host; // "http://localhost/";
      this.setWebBaseUrl = function (webBaseUrl) {
        this.webBaseUrl = webBaseUrl;
      };
      this.getWebBaseUrl = function () {
        return this.webBaseUrl;
      };

      this.projectId = '00001';

      this.setProjectId = function (projectId) {
        this.projectId = projectId;
      };
      this.getProjectId = function () {
        return this.projectId;
      };

      this.storageService = window.localStorage;  //default is localStorage
      this.setStorageService = function (storageService) {
        this.storageService = storageService;
      };
      this.getStorageService = function () {
        return this.storageService;
      };

      this.baseRoute = '';
      this.resolveRoute = function (name) {
        return name;
      };

      this.accessToken = '';
      this.getAccessToken = function () {
        return this.accessToken;
      };
      this.setAccessToken = function (accessToken) {
        this.accessToken = accessToken;
      };

      var self = this;

      this.$get = function () {
        return self;
      };
    }])
    .run(['$rootScope', 's3BpmService', 's3Config', function ($rootScope, s3BpmService, s3Config) {
      $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {

        /*  console.log('------');
         var pjid;
         pjid=s3Config.getProjectId();
         console.log(pjid);
         console.log('------');

         s3BpmService.S3BpmGetProcessDefinitionsByProjectId(pjid).then(function(res) {


         s3BpmService.S3BpmGetTaskListByProcessDefinitionKey(res.data[1]).then(function(res2){



         var queryp={};
         var queryd={
         "taskVariables" : [
         { "name":"tdo_enumber",
         "value":"",
         "operation" : "equals",
         "type" : "string"
         }
         ]

         };


         var x;


         x=s3BpmService.S3BpmQueryTasks(queryp,queryd,null,null);


         console.log('AAAA');
         console.log(res2.data[0].processInstanceId);
         console.log('BBBB');





         });


         //console.log(res.data[1]);
         });

         console.log('CCCC');
         // console.log(pdk);
         console.log('------');
         */

        // console.log('AAAA');
        // console.log(toParams.processInstanceId);
        // console.log('BBBB');

        if (toParams.processInstanceId && ( !$rootScope.response ||
          $rootScope.response.processInstanceId !== toParams.processInstanceId ||
          s3Config.resolveRoute($rootScope.response.pageName).name !== toState.name)) {
          //


          event.preventDefault();
          s3BpmService._defaultSuccess(toParams.processInstanceId, null);
        } else {

          // do nothing
        }


      });
    }])
    .factory('s3BpmService', ['$q', '$http', '$window', '$state', '$location', 's3Config', '$rootScope', '$interval',
      'ProcessInstanceService', 'TaskService',
      function ($q, $http, $window, $state, $location, s3Config, $rootScope, $interval,
                ProcessInstanceService, TaskService) {
        return {
          jsonToVariables: function (data) {
            var output = [];
            for (var key in data) {
              output.push({"name": key, "value": data[key]});
            }
            return output;
          },
          _defaultSuccess: function (processInstanceId, response) {

            console.log('>>> in default success and response:', response);

            var self = this;
            var deferred = $q.defer();
            if (!processInstanceId) {
              console.error('No processInstanceId in _defaultSuccess...');
              deferred.resolve('No processInstanceId in _defaultSuccess...');
            }
            else {
              var queryParams = {
                "access_token": s3Config.getAccessToken(),
                "includeTaskLocalVariables": true,        // only query task variables for correct widgetInput
                "processInstanceId": processInstanceId
              };



              TaskService.get(queryParams, function (response) {
                console.log('SUCCESS TaskService.get in _defaultSuccess, response:', JSON.stringify(response));


                if (response && response.size > 0) {
                  // response.size must be 1, since specific processInstanceId
                  var task = response.data[0];
                  $rootScope.response = response.data[0];


                  if (task.variables && task.variables.length > 0) {
                    // default widgetInput, pageName and redirectUrl process
                    task.variables.forEach(function (taskItem) {
                      if (taskItem.name === "widgetInput") {
                        task['widgetInput'] = taskItem.value ? JSON.parse(taskItem.value) : {};
                      }
                      else if (taskItem.name === "pageName") {
                        task['pageName'] = taskItem.value ? taskItem.value : "";
                      }
                      else if (taskItem.name === "redirectUrl") {
                        task['redirectUrl'] = taskItem.value ? taskItem.value : "";
                      }
                      else {
                        // pass
                      }
                    });

                    // default widgetInput, pageName and redirectUrl check
                    if (task['widgetInput'].type == 'common_widget_html') {
                      if (task['pageName']) {
                        console.log('widgetInput.type is common_widget_html, pageName is', task['pageName']);
                        var toParams = {"processInstanceId": processInstanceId};
                        $state.go(task['pageName'], toParams, {"reload": true});
                      }
                      else {
                        console.log('widgetInput.type is common_widget_html, but no pageName...');
                        deferred.resolve(task);
                      }
                    }
                    else if (task['widgetInput'].type == 'common_widget_redirect') {
                      // $location.href
                      if (task['redirectUrl']) {
                        console.log('widgetInput.type is common_widget_redirect, redirect to', task['redirectUrl']);
                        //
                        // $window.location.replace(task['redirectUrl']);
                        //
                        var child = $window.open(task['redirectUrl'], '_blank', 'height=568,width=375,menubar=0');

                        var func = $interval(function () {
                          if (child.closed) {
                            $interval.cancel(func);
                            console.log('>>> _defaultSuccess common_widget_redirect detect child window closed!');

                            self.S3BpmExecute(processInstanceId, task.id, {}, null, null);
                            // No success and error callback, go _defaultSuccess
                            return;
                          }

                          //if (child && !child.closed && child.location.href) {
                          //  var queryparam = $window.parseQuery(child.location.href);
                          //  if (queryparam) {
                          //
                          //  } else {
                          //    deferred.reject(false);
                          //  }
                          //  child.close();
                          //  clearInterval(func); // 當可偵測路徑則關閉
                          //} else {
                          //  clearInterval(func);
                          //  deferred.reject(false);
                          //}
                        }, 1000);
                      }
                      else {
                        console.log('widgetInput.type is common_widget_redirect but no redirectUrl...');
                        deferred.resolve(task);
                      }

                    }
                    else if ('common_widget_jsonschema') {
                      console.log('widgetInput.type is common_widget_jsonschema');
                      var toParams = {"processInstanceId": processInstanceId};
                      $state.go(task['pageName'], toParams, {"reload": false});
                    }
                    else {
                      console.log('UNKNOWN widgetInput.type');
                      deferred.resolve(task);
                    }
                  }
                  else {
                    // No Task local variables
                    deferred.resolve([]);
                  }
                }
                else {
                  // No Task For You
                  console.log('No task for you, ');
                  deferred.resolve([]);
                  //$state.go('common.main');
                }
              }, function (errorResponse) {
                // No Task For You
                console.log('No task for you, ');
                deferred.resolve([]);
              });
            }
            return deferred.promise;
          },
          S3BpmCreate: function (processDefinitionKey, bpmParameters, success, error, needAccessToken) {
            // node branch modified by Luke
            var self = this;
            var variable = this.jsonToVariables(bpmParameters);
            var data = {
              "processDefinitionKey": processDefinitionKey,
              "variables": variable
            };
            var queryParams = {};
            if (needAccessToken) {
              queryParams.access_token = s3Config.getAccessToken();
            }
            ProcessInstanceService.save(queryParams, data, function (response) {
              console.log('SUCCESS ProcessInstanceService.create', JSON.stringify(response));

              var processInstanceId = response.id;

              if (!success) {
                self._defaultSuccess(processInstanceId, response);
              }
              else {
                success(response).then(function (goDefaultSucess) {
                  if (goDefaultSucess) {
                    self._defaultSuccess(processInstanceId, response).then(function (data) {
                      console.log('Execute self._defaultSuccess complete.');
                    });
                  }
                  else {
                    console.log('User success handler return value false. _defaultSuccess complete.');
                  }
                }, function (err) {
                  console.error('Failed to execute self._defaultSuccess.');
                });
              }


            }, function (errorResponse) {
              var description = ''; // node branch modified by Luke
              switch (errorResponse.status) {
                case 0 :
                  description = 'API SERVER is Not reachable!';
                  break;
                default :
                  description = errorResponse.description ? errorResponse.description : 'UNKNOW (from Activiti)';
              }
              console.error('ERROR ProcessInstanceService.create', 'bpmParameters >> ', bpmParameters, 'data >> ', data);
              console.error('s3-activiti-middle description >> ', description, 'error response >> ', errorResponse);
              if (error) error(errorResponse); // error callback
            });
          },
          S3BpmQuery: function (processInstanceId, success, error) {

          },
          S3BpmQueryTasks: function (queryParameter, queryData, success, error) {
            var self = this;

            // queryData can not add other customers property, ex: accessToken
            TaskService.query(queryParameter, queryData, function (response) {
              console.log('SUCCESS S3BpmQueryTasks TaskService.query ', response);
              response.data.forEach(function (task) {

                var index = -1;
                for (var i = 0; i < task.variables.length; i++) {
                  if (task.variables[i].name === "widgetInput") {
                    index = i;
                  }
                }
                if (index > -1) {
                  task['widgetInput'] = JSON.parse(task.variables[index].value || '{}');
                } else {
                  task['widgetInput'] = {};
                }

                var pnIndex = -1;
                for (var j = 0; j < task.variables.length; j++) {
                  if (task.variables[j].name === "pageName") {
                    pnIndex = j;
                  }
                }
                if (pnIndex > -1) {
                  task['pageName'] = task.variables[pnIndex].value || '{}';
                } else {
                  task['pageName'] = {};
                }

                delete task['variables'];
              });

              if (success) {
                success(response); // success callback
              } else {

                self._defaultSuccess(response);
              }
            }, function (errorResponse) {
              var description = ''; // node branch modified by Luke
              console.error('ERROR S3BpmQueryTasks queryParameter >> ', queryParameter, ' queryData >>> ', queryData);
              if (error) error(errorResponse); // error callback
            });

          },
          S3BpmExecute: function (processInstanceId, taskId, bpmParameters, success, error) {
            // node branch modified by Luke
            var processInstanceId = processInstanceId;
            var self = this;
            var transFormVariables = [];
            if (bpmParameters.variables) {
              transFormVariables = this.jsonToVariables(bpmParameters.variables);
            }
            var data;
            if (bpmParameters.variables) {
              data = {
                "action": "complete",
                "variables": transFormVariables
              }
            } else {
              data = {"action": "complete", "variables": []};
            }
            var queryData = {
              "id": taskId,
              "access_token": s3Config.getAccessToken()
            };


            //console.log(queryData);
            // console.log(data);


            TaskService.execute(queryData, data, function (response) {
              console.log('SUCCESS S3BpmExecute TaskService.post', JSON.stringify(response));
              // response should be empty

              if (!success) {
                self._defaultSuccess(processInstanceId, response);
              }
              else {
                success(response).then(function (goDefaultSucess) {
                  if (goDefaultSucess) {
                    self._defaultSuccess(processInstanceId, response).then(function (data) {
                      console.log('Execute self._defaultSuccess complete.');
                    });
                  }
                  else {
                    console.log('User success handler return value false. _defaultSuccess complete.');
                  }
                }, function (err) {
                  console.error('Failed to execute self._defaultSuccess.', err);
                });
              }


            }, function (errorResponse) {
              var description = ''; // node branch modified by Luke
              switch (errorResponse.status) {
                case 0 :
                  description = 'API SERVER is Not reachable!';
                  break;
                default :
                  description = errorResponse.description ? errorResponse.description : 'UNKNOW (from Activiti)';
              }
              console.error('ERROR S3BpmExecute TaskService execute taskId >> ', taskId,
                'bpmParameters >> ', bpmParameters,
                'data >> ', data);
              console.error('s3-activiti-middle description >> ', description, 'error response >> ', errorResponse);
              if (error) error(errorResponse); // error callback
            });

          },
          S3BpmGetTaskListByUser: function (queryParams) {
            // node branch modified by Luke
            var self = this;

            // init queryParams
            if (!queryParams)
              queryParams = {};
            // setup default queryParams
            queryParams['access_token'] = s3Config.getAccessToken();
            queryParams['includeTaskLocalVariables'] = true;

            var deffered = $q.defer();
            TaskService.get(queryParams, function (response) {
              // console.log('SUCCESS TaskService.get', JSON.stringify(response));
              if (response && response.size > 0) {
                response.data.forEach(function (task) {
                  var index = -1;
                  for (var i = 0; i < task.variables.length; i++) {
                    if (task.variables[i].name === "widgetInput") {
                      index = i;
                    }
                  }
                  if (index > -1) {
                    task['widgetInput'] = JSON.parse(task.variables[index].value || '{}');
                  } else {
                    task['widgetInput'] = {};
                  }
                  var pnIndex = -1;
                  for (var i = 0; i < task.variables.length; i++) {
                    if (task.variables[i].name === "pageName") {
                      pnIndex = i;
                    }
                  }
                  if (pnIndex > -1) {
                    task['pageName'] = task.variables[pnIndex].value || '{}';
                  } else {
                    task['pageName'] = {};
                  }

                  delete task['variables'];
                });
                deffered.resolve(response);
              }
              else {
                deffered.resolve([]);
              }
            }, function (errorResponse) {
              var description = ''; // node branch modified by Luke
              switch (errorResponse.status) {
                case 0 :
                  description = 'API SERVER is Not reachable!';
                  break;
                default :
                  description = errorResponse.description ? errorResponse.description : 'UNKNOW (from Activiti)';
              }
              console.error('ERROR S3BpmGetTaskListByUser', 'error data >> ', errorResponse.data);
              console.error('s3-activiti-middle description >> ', description, 'error response >> ', errorResponse);
              deffered.reject(errorResponse);
            });

            return deffered.promise;
          },
          S3BpmGetTaskListByProcessDefinitionKey: function (processDefinitionKey, queryParams) {
            // node branch modified by Luke
            var self = this;
            // init queryParams
            if (!queryParams)
              queryParams = {};
            // setup default queryParams
            queryParams['processDefinitionKey'] = processDefinitionKey;
            queryParams['access_token'] = s3Config.getAccessToken();
            queryParams['includeTaskLocalVariables'] = true;

            //var queryData = {
            //  "processDefinitionKey": processDefinitionKey,
            //  "access_token": s3Config.getAccessToken(),
            //  "includeTaskLocalVariables": "true"
            //};

            var deffered = $q.defer();

            TaskService.get(queryParams, function (response) {
              // console.log('SUCCESS S3BpmGetTaskListByProcessDefinitionKey TaskService.get', JSON.stringify(response));

              if (response && response.size > 0) {

                response.data.forEach(function (task) {

                  var index = -1;
                  for (var i = 0; i < task.variables.length; i++) {
                    if (task.variables[i].name === "widgetInput") {
                      index = i;
                    }
                  }
                  if (index > -1) {
                    task['widgetInput'] = JSON.parse(task.variables[index].value || '{}');
                  } else {
                    task['widgetInput'] = {};
                  }

                  var pnIndex = -1;
                  for (var i = 0; i < task.variables.length; i++) {
                    if (task.variables[i].name === "pageName") {
                      pnIndex = i;
                    }
                  }
                  if (pnIndex > -1) {
                    task['pageName'] = task.variables[pnIndex].value || '{}';
                  } else {
                    task['pageName'] = {};
                  }

                  delete task['variables'];
                });
                deffered.resolve(response);
              }
              else {
                deffered.resolve([]);
              }
            }, function (errorResponse) {
              var description = ''; // node branch modified by Luke
              switch (errorResponse.status) {
                case 0 :
                  description = 'API SERVER is Not reachable!';
                  break;
                default :
                  description = errorResponse.description ? errorResponse.description : 'UNKNOW (from Activiti)';
              }
              console.error('ERROR S3BpmGetTaskListByProcessDefinitionKey', 'error data >> ', errorResponse.data);
              console.error('s3-activiti-middle description >> ', description, 'error response >> ', errorResponse);
              // return error;
              deffered.reject(errorResponse);
            });

            return deffered.promise;
          },
          S3BpmGetTaskByTaskIdAndUser: function (taskId) {
            var queryData = {
              'id': taskId,
              'access_token': s3Config.getAccessToken()
            };
            var deferred = $q.defer();
            TaskService.get(queryData, function (task) {
              console.log('TaskService GET Task By Id And User Success!!');
              deferred.resolve(task);
            }, function (errResponse) {
              console.error('TaskService GET Task By Id And User Error...', errResponse);
              deferred.reject(errResponse);
            });
            return deferred.promise;
          },
          S3BpmGetWidgetInputByTaskId: function (taskId) {
            var self = this;
            var data = {
              'id': taskId,                               // TaskService
              'variableName': 'widgetInput',              // TaskService
              'access_token': s3Config.getAccessToken()
            };
            var deferred = $q.defer();
            TaskService.getVariablesFromTask(data, function (task) {
              console.log('TaskService S3BpmGetWidgetInputByTaskId Success!!');
              // console.log(taskList);
              deferred.resolve(task);
            }, function (errResponse) {
              console.error('TaskService S3BpmGetWidgetInputByTaskId Error...', errResponse);
              deferred.reject(errResponse);
            });
            return deferred.promise;
          },
          S3BpmGetProcessDefinitionsByProjectId: function (projectId) {
            var deferred = $q.defer();
            $http({
              "method": "GET",
              "url": s3Config.apiBaseUrl + 'query/processDefinitionsByProjectId/' + projectId
            }).then(function successCallback(response) {
              deferred.resolve(response);
            }, function errorCallback(error) {
              deferred.reject(error);
            });
            return deferred.promise;
          }

        };
      }]);
})(window, window.angular);

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

/**
 * Created by lukehuang on 2015/7/30.
 */



(function (window, angular) {


  var ActivitiRest = angular.module('ActivitiRest', ['ngResource', 's3']);

  ActivitiRest
    .factory('ProcessInstanceService', ['$resource', 's3Config', function ($resource, s3Config) {

    function ProcessInstanceService() {
      var self = this;


      return $resource(s3Config.apiBaseUrl + 'runtime/process-instances/:id', {id: '@id'},
        {
          'getDiagram': {
            'method': 'GET',
            'url': s3Config.apiBaseUrl + 'runtime/process-instances/:id/diagram'
          },
          'query': {
            'method': 'POST',
            'url': s3Config.apiBaseUrl + 'query/process-instances'
          }


        });
    }

    return new ProcessInstanceService();
  }])
    .factory('TaskService', ['$resource', 's3Config', function ($resource, s3Config) {

      function TaskService() {
        var self = this;


        return $resource(s3Config.apiBaseUrl + 'runtime/tasks/:id', {id: '@id'},
          {

            'query': {
              'method': 'POST',
              'url': s3Config.apiBaseUrl + 'query/tasks'
            },

            'execute': {
              'method': 'post',
              'url': s3Config.apiBaseUrl + 'runtime/tasks/:id'
            },
            'getVariablesForATask': {
              'method': 'GET',
              'url': s3Config.apiBaseUrl + 'runtime/tasks/:id/variables'
            },
            'getVariablesFromTask': {
              'method': 'GET',
              'param': {variableName: '@variableName'},
              'url': s3Config.apiBaseUrl + 'runtime/tasks/:id/variables/:variableName'
            },
            'getBinaryDataForVariable': {
              'method': 'GET',
              'param': {variableName: '@variableName'},
              'url': s3Config.apiBaseUrl + 'runtime/tasks/:id/variables/:variableName/data'
            },
            'createVariableOnTask': {
              'method': 'POST',
              'url': s3Config.apiBaseUrl + 'runtime/tasks/:id/variables'
            }
          });
      }

      return new TaskService();
    }])
    .factory('HistoryService', ['$resource', 's3Config', function ($resource, s3Config) {

      function HistoryService() {
        var self = this;


        return $resource(s3Config.apiBaseUrl + 'history/historic-process-instances/:processInstanceId', {processInstanceId: '@processInstanceId'},
          {

            'query': {
              'method': 'POST',
              'url': s3Config.apiBaseUrl + 'query/historic-process-instances/'
            },
            'getBinaryDataForHistoric':{
              'method': 'GET',
              'param': {variableName: '@variableName'},
              'url': s3Config.apiBaseUrl + 'history/historic-process-instances/:processInstanceId/variables/:variableName/data'
            },
            'getHistoricTask':{
              'method': 'GET',
              'url': s3Config.apiBaseUrl + 'history/historic-task-instances'
            },
            'getSingleHistoricTask':{
              'method': 'GET',
              'param': {taskId: '@taskId'},
              'url': s3Config.apiBaseUrl + 'history/historic-task-instances/:taskId'
            },
            'queryHistoricTask':{
              'method': 'POST',
              'url': s3Config.apiBaseUrl + 'query/historic-task-instances/'
            },
            'deleteHistoricTask':{
              'method': 'DELETE',
              'param': {taskId: '@taskId'},
              'url': s3Config.apiBaseUrl + 'history/historic-task-instances/:taskId'
            }

          });
      }

      return new HistoryService();
    }])

})(window, window.angular);

angular.module("s3").run(["$templateCache", function($templateCache) {$templateCache.put("s3/template/avaliableProcessTemplate.html","<h2>Avaliable Process</h2>\n<ul ng-repeat=\"processId in processList\">\n  <li><a s3-create-bpm-process=\"{{processId}}\" user-token=\"true\" pdata=\"{}\">{{processId}}</a></li>\n</ul>\n");}]);