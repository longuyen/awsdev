const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const DynamoDB = new AWS.DynamoDB.DocumentClient();

var tableName = 'rxSnapshot';
var indexName = 'patientIdLastModifiedDateIndex';
var rxIdKeyName = "RxId";

var responseBody = {
    rxs: []
};


var rxIds = [];

function collectRxIds(err, data, callback) {
    if (err) console.log(err);
    else {
        var numOfRx = data.Items.length;
        if (numOfRx) {2
		for (var i = 0; i < numOfRx; i++) {
		    var rxId = data.Items[i].RxId;
		    rxIds.push(rxId);
		}
        }
        console.log(rxIds);
    }
}

function queryDDB() {
    DynamoDB.query(queryParams, collectRxIds);
}

function getDDB(rxIds) {

    var getParam = {
        "TableName": tableName,
        "ConsistentRead": true,
    };

    console.log("RxIds: " + JSON.stringify(rxIds));
    for (var i = 0; i < rxIds.length; i++) {
        getParam.Key = {"RxId": rxIds[i]};
        DynamoDB.get(getParam, function (err, data) {
		if (err) {
		    console.log(err);
		    console.log('Error Getting Item from DynamoDB for TableName: ' + tableName +
				' keyName: ' + keyName + ' keyValue: ' + keyValue);
		}
		else {
		    responseBody.rxs.push({
			    "rxId": data.Item.RxId,
				"medicationDescription": data.Item.Medication.drugDescription.S,
				"prescriberName": data.Item.Prescriber.firstName.S + " " + data.Item.Prescriber.lastName.S,
				"Status": data.Item.Status
				});
		}
	    });
    }
    console.log(responseBody);
}


function getRxDetailsForPatientId(patientId) {
    var queryParams = {
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: 'PatientId = :patientId',
        ExpressionAttributeValues: { ':patientId': patientId }
    };

    DynamoDB.query(queryParams, function (err, data) {
	    var rxIds = [];
	    if (err) console.log(err);
	    else {
		console.log(data);
		var numOfRx = Object.assign(data.Items.length);
		if (numOfRx) {
		    for (var i = 0; i < numOfRx; i++) {
			console.log("RxId " + data.Items[i].RxId);
			var rxId = data.Items[i].RxId;
			rxIds.push(rxId);
		    }
		}

		var getParam = {
		    RequestItems: {
			rxSnapshot: {
			    Keys: []
			}
		    }
		};

		for (var i = 0; i < rxIds.length; i++) {
		    var key = { "RxId": rxIds[i] };
		    getParam.RequestItems.rxSnapshot.Keys.push(key);
		}

		DynamoDB.batchGet(getParam, function (err, data) {
			if (err) {
			    console.log(err);
			    console.log('Error Getting Item from DynamoDB for TableName: ' + tableName +
					' keyName: ' + keyName + ' keyValue: ' + keyValue);
			}
			else {
			    var rxList = [];
			    data.Responses.rxSnapshot.forEach(element => addRxToList(element, rxList))
				printResponse(rxList);
			}
		    });
	    }
	});
}

function addRxToList(rxDetails, rxList) {
    rxList.push({
	    "rxId": rxDetails.RxId,
		"medicationDescription": rxDetails.Medication.drugDescription.S,
		"prescriberName": rxDetails.Prescriber.firstName.S + " " + rxDetails.Prescriber.lastName.S,
		"Status": rxDetails.Status
		});
}

function printResponse(rxList) {
    responseBody.rxs = rxList;
    console.log(responseBody);
}