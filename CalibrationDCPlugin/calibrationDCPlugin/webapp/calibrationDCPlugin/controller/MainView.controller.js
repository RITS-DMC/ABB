var oWebController, oBundle;
sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (jQuery, PluginViewController, JSONModel, MessageToast) {
	"use strict";

	return PluginViewController.extend("abb.views.calibrationDC.calibrationDCPlugin.calibrationDCPlugin.controller.MainView", {
		onInit: function () {
			PluginViewController.prototype.onInit.apply(this, arguments);
            oBundle = this.getView().getModel("i18n").getResourceBundle();
			oWebController=this;
            this.subscribe("WorklistSelectEvent", this.processWorklistChange,this);
            this.subscribe("OperationListSelectEvent", this.processWorklistChange, this);
            this._bus = sap.ui.getCore().getEventBus();
            oWebController.processLangaugeChange("firei18n");
		},

        processWorklistChange: function(){  
            setTimeout(function() {
                    oWebController.onAfterRendering();
                }, 1000);
                
        },

        processLangaugeChange: function (action) {
            var payload = {
                message: "Triggered from Extension Plugin",
                timestamp: new Date().toISOString(),
                event: action
            };
            this._bus.publish("abb.views.plugins", "i18nCustomString", payload);
        },

        onAfterRendering: function(){
            //oWebController.processLangaugeChange("firei18n");
            oWebController.getView().byId("backButton").setVisible(oWebController.getConfiguration().backButtonVisible);
            oWebController.getView().byId("closeButton").setVisible(oWebController.getConfiguration().closeButtonVisible);
            oWebController.getView().byId("headerTitle").setText(oWebController.getConfiguration().title);
            oWebController.getView().byId("errorCodeLabelId").setRequired(false);
            oWebController.getView().byId("errorCodeInputId").setEnabled(false);
            oWebController.getView().byId("remarksLabelId").setRequired(false);
            oWebController.getView().byId("remarkInputId").setEnabled(false);
            var oModel = new JSONModel({
				STATUS:true,
				DRIFT_VALUE:"",
			    RECK:"",
				SPOT:"",
				ERROR_CODE:"",
				REMARK:""
			});
			oWebController.getView().setModel(oModel, "dcDataModel");
            oWebController.getView().setModel(new JSONModel({dataList: []}), "dcHistorianModel");
            //oWebController.getView().byId("contentBoxId").setVisible(true);
            oWebController.getView().byId("saveBtnId").setEnabled(false);
            oWebController.getView().byId("clearBtnId").setEnabled(false);
            oWebController.checkIsSfcActive();
        },

		onBeforeRenderingPlugin: function () {
						
		},
        checkIsSfcActive: function(){
            const currentPlant = oWebController.getPodController().getUserPlant();
			const currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }
			var checkIsSfcActiveUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyCheckSFCActive;
            var requestBody = {
                IN_PLANT: currentPlant,
				IN_SFC: currentSfc
            };
            oWebController.ajaxPostRequest(
                checkIsSfcActiveUrl,
                requestBody,
                function (oCheckIsSfcActiveResponseData) {
                    oWebController.checkCalibrationDCStatus();
                },
                function (oError, sHttpErrorMessage) {
					if(oError.code === 'errProcessExecution'){
                        //oWebController.getView().byId("contentBoxId").setVisible(false);
                        oWebController.getView().byId("saveBtnId").setEnabled(false);
                        oWebController.getView().byId("clearBtnId").setEnabled(false);
                        oWebController.getView().byId("headerTitle").setText(oError.details[0].message);
						//oWebController.errorDialog(oError.details[0].message);
					}else{
                        oWebController.getView().byId("headerTitle").setText(oWebController.getConfiguration().title);
                        MessageToast.show(oBundle.getText("error.sfcActiveCheck.msg"));
                    }
                    oWebController.loadDCHistorianTable();
                    console.error("Error during API call:", oError || sHttpErrorMessage);
                }
            );
        },

        checkCalibrationDCStatus:function(){
            const currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            const currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            const operation = currentOperationsData[0]?.operation;
            const currentResource = oWebController.getPodSelectionModel().resource.resource;
            const currentPlant = oWebController.getPodController().getUserPlant();
            const dcGroup = oWebController.getConfiguration().calibrationDCName;
            if(!currentResource){
                MessageToast.show(oBundle.getText("error.resourceRequired.msg"));
                return;
            }if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }if(!operation){
                MessageToast.show(oBundle.getText("error.operationRequired.msg"));
                return;
            }if(!dcGroup){
                MessageToast.show(oBundle.getText("error.calibrationDCNameRequired.msg"));
                return;
            }
			var caliDCStatusUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyCheckCaliDCIsConfig;

            var requestBody = {
                inDCGroup: dcGroup,
                inOperation: operation,
                inPlant: currentPlant,
                inResource: currentResource,
				inSfc: currentSfc
            };

            oWebController.ajaxPostRequest(
                caliDCStatusUrl,
                requestBody,
                function (oCaliDCStatusResponseData) {
					if(oCaliDCStatusResponseData?.OUT_IS_NOT_APPLICABLE){
                        //oWebController.getView().byId("contentBoxId").setVisible(false);
                        oWebController.getView().byId("saveBtnId").setEnabled(false);
                        oWebController.getView().byId("clearBtnId").setEnabled(false);
                        oWebController.getView().byId("headerTitle").setText(oBundle.getText("error.calibrationDCConfig.msg",[dcGroup,currentSfc]));
						//oWebController.errorDialog("DC Group '"+dcGroup+"' is not configured for SFC '"+currentSfc+"'.");
					}else{
                        oWebController.getView().byId("saveBtnId").setEnabled(true);
                        oWebController.getView().byId("clearBtnId").setEnabled(true);
                        oWebController.getView().byId("headerTitle").setText(oWebController.getConfiguration().title);
						oWebController.loadDCHistorianTable();
					}
                },
                function (oError, sHttpErrorMessage) {
                    if(oError.code === 'errProcessExecution'){
                        //oWebController.getView().byId("contentBoxId").setVisible(false);
                        oWebController.getView().byId("saveBtnId").setEnabled(false);
                        oWebController.getView().byId("clearBtnId").setEnabled(false);
                        oWebController.getView().byId("headerTitle").setText(oError.details[0].message);
						//oWebController.errorDialog("An error occurred, while checking allow to perform calibration DC: "+oError.details[0].message);
					}else{
                        oWebController.getView().byId("headerTitle").setText(oWebController.getConfiguration().title);
                        MessageToast.show(oBundle.getText("error.calibrationDCPerform.msg"));
                    }
                    console.error("Error during API call:", oError || sHttpErrorMessage);
                }
            );
        },

        errorDialog: function(message){
            oWebController.onClearPress();
            oWebController.getView().setModel(new JSONModel({dataList: []}), "dcHistorianModel");
            var oCaliDCErrorDialog = new sap.m.Dialog("idCaliDCErrorDialog", {
                title: 'Confirmation',
                type: 'Message',
                content: new sap.m.Text({
                    text: message
                }),
                endButton: new sap.m.Button({
                    text: 'Ok',
                    type: "Emphasized",
                    press: function () {
                        //oWebController.getView().byId("contentBoxId").setVisible(false);
                        oWebController.getView().byId("saveBtnId").setEnabled(false);
                        oWebController.getView().byId("clearBtnId").setEnabled(false);
                        oCaliDCErrorDialog.close();
                    }
                }),
                afterClose: function () {
                    oCaliDCErrorDialog.destroy();
                }
            });
            oCaliDCErrorDialog.open();
        },

        onStatusChange: function(event){
            var newStatus = event.getParameters().state;

            oWebController.getView().byId("errorCodeLabelId").setRequired(!newStatus);
            oWebController.getView().byId("errorCodeInputId").setEnabled(!newStatus);
            oWebController.getView().byId("errorCodeInputId").setValue("");
            oWebController.getView().byId("remarksLabelId").setRequired(!newStatus);
            oWebController.getView().byId("remarkInputId").setEnabled(!newStatus);
            oWebController.getView().byId("remarkInputId").setValue("");
        },

        loadDCHistorianTable: function(){
            const currentPlant = oWebController.getPodController().getUserPlant();
            const currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            const currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            const operation = currentOperationsData[0]?.operation;
            const operationVersion = currentOperationsData[0]?.version;
            const currentResource = oWebController.getPodSelectionModel().resource.resource;
            const calibrationDC=oWebController.getConfiguration().calibrationDCName;
            if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }if(!operation){
                MessageToast.show(oBundle.getText("error.operationRequired.msg"));
                return;
            }if(!calibrationDC){
                MessageToast.show(oBundle.getText("error.calibrationDCNameRequired.msg"));
                return;
            }
            var dcHistorianUrl = oWebController.getPublicApiRestDataSourceUri() 
            + "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCHistorianData;
			oWebController.ajaxPostRequest(
                dcHistorianUrl,
                { inDCGroup: calibrationDC, inPlant: currentPlant, inResource: currentResource, inSfc: currentSfc, inOperVersion: operationVersion, inOperation: operation},
                function (oDcHistorianResponse) {
                    if(oDcHistorianResponse?.outErrMsg){
                        MessageToast.show(oDcHistorianResponse?.outErrMsg);
						return;
					}else{
                        const convertedData = oWebController.transformJsonForDCHistorian(oDcHistorianResponse?.outDC1);
                        const oModel = new JSONModel({ dataList: convertedData });
                        oWebController.getView().setModel(oModel, "dcHistorianModel");
                        console.log(convertedData);
                    }
                },
                function (oError) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
                        MessageToast.show(oBundle.getText("error.getCalibrationDCData.msg",[sErrorMsg]));
					}
                    console.error("While call Complete SFC error:", oError);
                }
            );
        },

        transformJsonForDCHistorian: function(data) {
            const grouped = {};

            data.forEach(item => {
                const key = item.LastUpdatedAt;
                if (!grouped[key]) {
                grouped[key] = {
                    LastUpdatedAt: item.LastUpdatedAt,
                    UserId: item.UserId,
                    DcGroup: item.DcGroup
                };
                }
                const value = item.DcParameterValue === "NOT COLLECTED" ? "" : item.DcParameterValue;
                grouped[key][item.DcParameterName] = value;
            });
            return Object.values(grouped)
                .sort((a, b) => new Date(b.LastUpdatedAt) - new Date(a.LastUpdatedAt));
        },

        onCollectPress: function () {
            const currentModel = oWebController.getView().getModel("dcDataModel");
            const currentData = currentModel.getData();
            const currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            const currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            const operation = currentOperationsData[0]?.operation;
            const operationVersion = currentOperationsData[0]?.version;
            const currentResource = oWebController.getPodSelectionModel().resource.resource;
            const currentPlant = oWebController.getPodController().getUserPlant();
            const dcGroup = oWebController.getConfiguration().calibrationDCName;
            const currentVersion = oWebController.getConfiguration().calibrationDCVersion;
            if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }if(!operation){
                MessageToast.show(oBundle.getText("error.operationRequired.msg"));
                return;
            }if(!dcGroup){
                MessageToast.show(oBundle.getText("error.calibrationDCNameRequired.msg"));
                return;
            }if(!currentVersion){
                MessageToast.show(oBundle.getText("error.calibrationDCVersionRequired.msg"));
                return;
            }
            var parameterValues = Object.entries(currentData).map(([key, value]) => {
                if (key === "STATUS") {
                    value = value === true ? "PASS" : "FAIL";
                }
                return {
                    name: key,
                    value: value
                };
            });
            var check=false;
            var isValid = parameterValues.every(function (param) {
                if(param.name === "STATUS" && param.value === "PASS"){
                    check=true;
                }
                if(check && (param.name === "ERROR_CODE" || param.name === "REMARK")){
                    return true;
                }
            return param.value !== undefined && param.value !== null && param.value.toString().trim() !== "";
            });
            if (!isValid) {
                MessageToast.show(oBundle.getText("error.missingParams.msg"));
                return;
            }

            var myDcGroupUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyLogDC;

            var requestBody = {
                resource: currentResource,
                plant: currentPlant,
                sfcs: [currentSfc],
                group: {
                    "dcGroup": dcGroup,
                    "version": currentVersion
                },
                operation: {
                    "operation": operation,
                    "version": operationVersion
                },
                parameterValues: parameterValues
            };

            console.log("Request body:", requestBody);

            oWebController.ajaxPostRequest(
                myDcGroupUrl,
                requestBody,
                function (oResponseData) {
                    console.log("Response of the Log Calibration DC DPP:", oResponseData);
                    oWebController.onClearPress();
                    oWebController.onClosePress();
                    MessageToast.show(oBundle.getText("success.calibrationDataLogged.msg"));
                },
                function (oError, sHttpErrorMessage) {
                    console.error("Error during API call:", oError || sHttpErrorMessage);
                    MessageToast.show(oBundle.getText("error.calibrationDataLogging.msg"));
                }
            );
        },

        onClearPress: function(){
            const oModel = oWebController.getView().getModel("dcDataModel");
            if(oModel){
                const params = oModel.getProperty("/"); // Get root data object
                params.STATUS = true;
                params.DRIFT_VALUE = "";
                params.RECK = "";
                params.SPOT = "";
                params.ERROR_CODE = "";
                params.REMARK = "";
                oModel.setProperty("/", params);
                //MessageToast.show("Calibration data has been cleared successfully.");
            }
        },

        onLiveChangeNumber: function(oEvent) {
            var input = oEvent.getSource();
            var value = input.getValue();
            // Regex: optional negative, digits, optional decimal
            var regex = /^\d*(\.\d*)?$/;
            if (!regex.test(value)) {
                // Remove last character OR reset to previous valid value
                // Here, we simply remove anything invalid
                value = value.slice(0, -1);
                input.setValue(value);
            }
        },

        onLiveChangeInt: function(oEvent) {
            var input = oEvent.getSource();
            var value = input.getValue();
            // Regex: optional negative, digits, NO decimal allowed
            var regex = /^\d*$/;
            if (!regex.test(value)) {
                // Remove last character OR reset to previous valid value
                value = value.slice(0, -1);
                input.setValue(value);
            }
        },

        isSubscribingToNotifications: function() {
            
            var bNotificationsEnabled = true;
           
            return bNotificationsEnabled;
        },


        getCustomNotificationEvents: function(sTopic) {
            //return ["template"];
        },


        getNotificationMessageHandler: function(sTopic) {

            //if (sTopic === "template") {
            //    return this._handleNotificationMessage;
            //}
            return null;
        },

        _handleNotificationMessage: function(oMsg) {
           
            var sMessage = "Message not found in payload 'message' property";
            if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
                for (var i = 0; i < oMsg.parameters.length; i++) {

                    switch (oMsg.parameters[i].name){
                        case "template":
                            
                            break;
                        case "template2":
                            
                        
                        }        
          

                    
                }
            }

        },
        

		onExit: function () {
			PluginViewController.prototype.onExit.apply(this, arguments);


		}
	});
});