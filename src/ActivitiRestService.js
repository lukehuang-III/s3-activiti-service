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
