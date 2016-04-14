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
