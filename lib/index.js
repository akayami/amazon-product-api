var generateQueryString = require('./utils').generateQueryString,
  request = require('request'),
  xml2json = require('xml2json'),
  Promise = require('es6-promise').Promise;

var runQuery = function (credentials, method) {

  return function (query, cb) {
    var url = generateQueryString(query, method, credentials);
    var xmlToJsonOptions = {
      object: true,
      alternateTextNode: true
    };

    if (typeof cb === 'function') {
      request(url, function (err, response, body) {

        if (err) {
          cb(err);
        } else if (!response) {
          cb("No response (check internet connection)");
        } else if (response.statusCode !== 200) {
          parseXML(body, function (err, resp) {
            if (err) {
              cb(err);
            } else {
              cb(resp[method + 'ErrorResponse']);
            }
          });
        } else {
          parseXML(body, function (err, resp) {
            if (err) {
              cb(err);
            } else {
              var respObj = resp[method + 'Response'];
              if (respObj.Items && respObj.Items.length > 0) {
                // Request Error
                if (respObj.Items[0].Request && respObj.Items[0].Request.length > 0 && respObj.Items[0].Request[0].Errors) {
                  cb(respObj.Items[0].Request[0].Errors);
                } else if (respObj.Items[0].Item) {
                  cb(null, respObj.Items[0].Item);
                }
              } else if (respObj.BrowseNodes && respObj.BrowseNodes.length > 0 && respObj.BrowseNodes[0].BrowseNode) {
                cb(null, respObj.BrowseNodes[0].BrowseNode);
              }
            }
          });
        }
      });
      return;
    }

    var promise = new Promise(function (resolve, reject) {
      request(url, function (err, response, body) {

        if (err) {
          reject(err);
        } else if (!response) {
          reject("No response (check internet connection)");
        } else if (response.statusCode !== 200) {
          var resp = xml2json.toJson(body, xmlToJsonOptions);
          reject(resp[method + 'ErrorResponse']);
        } else {
          var resp = xml2json.toJson(body, xmlToJsonOptions);
          var respObj = resp[method + 'Response'];

          if (respObj.Items && Object.keys(respObj.Items).length > 0) {
            // Request Error
            if (respObj.Items.Request && Object.keys(respObj.Items.Request).length > 0 && respObj.Items.Request.Errors) {
              reject(respObj.Items.Request.Errors);
            } else if (respObj.Items.Item) {
              resolve(respObj.Items.Item);
            }
          } else if (respObj.BrowseNodes && Object.keys(respObj.BrowseNodes).length > 0 && respObj.BrowseNodes.BrowseNode) {
            resolve(respObj.BrowseNodes.BrowseNode);
          }
        }
      });
    });

    return promise;
  };
};

var createClient = function (credentials) {
  return {
    itemSearch: runQuery(credentials, 'ItemSearch'),
    itemLookup: runQuery(credentials, 'ItemLookup'),
    browseNodeLookup: runQuery(credentials, 'BrowseNodeLookup')
  };
};

exports.createClient = createClient;
