var oWebController, oBundle;
sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (jQuery, PluginViewController, JSONModel, MessageToast) {
	"use strict";

	return PluginViewController.extend("abb.views.reLogCompleteRC.reLogCompleteRCPlugin.reLogCompleteRCPlugin.controller.MainView", {
        reasonCodeDCName: '',
        reasonCodeDCVersion: '',
        reasonCodeConfigurationDCName: '',
        onInit: function () {
            PluginViewController.prototype.onInit.apply(this, arguments);
            oBundle = this.getView().getModel("i18n").getResourceBundle();
            oWebController = this;
            // Initialize the model
            var oModel = new JSONModel();
            this.getView().setModel(oModel);
        },

        onAfterRendering: function () {
            oWebController.getView().byId("closeButton").setVisible(oWebController.getConfiguration().closeButtonVisible);
            oWebController.getView().byId("headerTitle").setText(oBundle.getText(oWebController.getConfiguration().title));
            //Reading Plugin Properties Data
            oWebController.reasonCodeDCName = oWebController.getConfiguration().reasonCodeDCName;
            oWebController.reasonCodeDCVersion = oWebController.getConfiguration().reasonCodeDCVersion;
            oWebController.reasonCodeConfigurationDCName = oWebController.getConfiguration().reasonCodeConfigurationDCName;
            oWebController._dcGroupData();
        },

        _dcGroupData: function () {
            var currentPlant = oWebController.getPodController().getUserPlant();
            var myDcGroupUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCParameterData;

            oWebController.ajaxPostRequest(
                myDcGroupUrl,
                { plant: currentPlant, group: oWebController.reasonCodeDCName },
                function (oDcGroupResponse) {
                    console.log("DC Group Response:", oDcGroupResponse);

                    var dcData = oDcGroupResponse?.dcList?.[0];
                    if (!dcData) {
                        console.warn("No DC Group data returned");
                        return;
                    }

                    var dcParams = dcData.dcParameters || [];
                    var tableData = dcParams.map(function (param) {
                        return {
                            name: param.parameterName,
                            parameterPrompt: oBundle.getText(param.parameterPrompt),
                            type: param.dcParameterType,
                            placeHolder:oBundle.getText("input.parameterValue.placeHolder")+" "+oBundle.getText(param.parameterPrompt),
                            parameterValue: ""
                        };
                    });

                    var oModel = new sap.ui.model.json.JSONModel({
                        group: dcData.group,
                        groupDescription: dcData.description,
                        version: dcData.version,
                        status: dcData.status,
                        order:"",
                        sfc:"",
                        operation:"",
                        operationVersion:"",
                        workCenter:"",
                        resource:"",
                        params: tableData
                    });

                    oWebController.getView().setModel(oModel, "paramsModel");
                    console.log("Final bound model:", oModel.getData());
                },
                function (oError, sHttpErrorMessage) {
                    console.error("Error during DC Group API call:", oError || sHttpErrorMessage);
                });
        },

        loadDCHistorianTable: function(){
            const currentModel = oWebController.getView().getModel("paramsModel");
            const currentData = currentModel.getData();
            const currentPlant = oWebController.getPodController().getUserPlant();
            const currentSfc = currentData.sfc;
            const operation = currentData.operation;
            const dcGroup = currentData.group;
            if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }if(!dcGroup){
                MessageToast.show(oBundle.getText("error.completeReasonCodeDcNameConfig.msg"));
                return;
            }
            var requestJson = { inDCGroup: dcGroup, inPlant: currentPlant, inSfc: currentSfc};
            if (operation) {
                requestJson.inOperation = operation;
            }
            var dcHistorianUrl = oWebController.getPublicApiRestDataSourceUri() 
            + "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCHistorianData;
			oWebController.ajaxPostRequest(
                dcHistorianUrl,
                requestJson,
                function (oDcHistorianResponse) {
                    if(oDcHistorianResponse?.outErrMsg){
                        MessageToast.show(oDcHistorianResponse?.outErrMsg);
						return;
					}else{
                        const convertedData = oWebController.transformJsonForDCHistorian(oDcHistorianResponse?.outDC);
                        const oModel = new JSONModel({ dataList: convertedData });
                        oWebController.getView().setModel(oModel, "dcHistorianModel");
                        oWebController.getView().getModel("dcHistorianModel").refresh(true);
                    }
                },
                function (oError) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
						MessageToast.show(oBundle.getText("error.getCompleteReasonCodeDCData.msg",[sErrorMsg]));
					}
                    console.error("An error occurred, while calling getting Complete Reason Code DC Data:", oError);
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
                    DcGroup: item.DcGroup,
                    OperationActivity: item.OperationActivity
                };
                }
                const value = item.DcParameterValue === "NOT COLLECTED" ? "" : item.DcParameterValue;
                grouped[key][item.DcParameterName] = value;
            });
            return Object.values(grouped)
                .sort((a, b) => new Date(b.LastUpdatedAt) - new Date(a.LastUpdatedAt));
        },

        // Order Selection
        onOrderValueHelpRequest: function(oEvent){
            var currentPlant = oWebController.getPodController().getUserPlant();
            var orderListApiUrl = oWebController.getPublicApiRestDataSourceUri() + "/dmci/v4/extractor/SFC"; 
			var oData = {
                        "$format": "json",
                        "$filter": `PLANT eq '${currentPlant}' and STATUS eq 'DONE'`
                    };
            $.ajax({
                    url: orderListApiUrl,
                    data: oData,
                    method: "GET"
            }).then(results => {
				var resultData = (Array.isArray(results.value) ? results.value : []).map(result => ({
                    order: result.MFG_ORDER,
                    orderSfc: result.SFC
                }));
                if(Array.isArray(resultData) && resultData.length === 0){
                    MessageToast.show(oBundle.getText("error.noAvailableOrders.msg"));
                }else{
                    var oModel = new sap.ui.model.json.JSONModel({ orderList: resultData });
                    oWebController.getView().setModel(oModel, "orderValueHelpModel");
                    var oDialog = oWebController.byId("idOrderValueHelpDialog");
                    if (oDialog) {
                        oDialog.open();
                    } else {
                        console.error("Dialog with ID 'idOrderValueHelpDialog' not found.");
                    }
                }
            }).catch(error => {
                MessageToast.show(oBundle.getText("error.getOrderList.msg"));
				console.log("Extractor SFC API Error:", error);
            });
        },

        onOrderSearchValueHelp:function (oEvent) {
            const query = oEvent.getParameter("newValue").toLowerCase();
            const binding = oWebController.byId("idOrderValueHelpTable").getBinding("items");
            binding.filter(new sap.ui.model.Filter([
                new sap.ui.model.Filter("order", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("orderSfc", sap.ui.model.FilterOperator.Contains, query)
            ], false));
        },

        onOrderValueHelpConfirm: function (oEvent) {
            const selectedItem = oEvent.getParameter("listItem");
            const selectedData = selectedItem.getBindingContext("orderValueHelpModel").getObject();
            oWebController.getView().getModel("paramsModel").setProperty("/order", selectedData.order);            
            oWebController.getView().getModel("paramsModel").setProperty("/sfc", selectedData.orderSfc);
            oWebController.getView().getModel("paramsModel").setProperty("/operation", "");
            oWebController.loadDCHistorianTable();
            oWebController.byId("idOrderValueHelpDialog").close();
        },

        onCancelOrderValueHelp: function () {
            oWebController.byId("idOrderValueHelpDialog").close();
        },

        // SFC Selection
        onSFCValueHelpRequest: function(oEvent){
            console.log(oEvent);
            var currentPlant = oWebController.getPodController().getUserPlant();
			var selectedOrder = oWebController.getView().getModel("paramsModel").getProperty("/order");
            var mdoSFCUrl = oWebController.getPublicApiRestDataSourceUri() + "/dmci/v4/extractor/SFC"; 
			var oData = {
                        "$format": "json"
                    };
			let filters = [`PLANT eq '${currentPlant}' and STATUS eq 'DONE'`];
			if (selectedOrder) {
				filters.push(`MFG_ORDER eq '${selectedOrder}'`);
			}
			oData["$filter"] = filters.join(' and ');
            $.ajax({
                    url: mdoSFCUrl,
                    data: oData,
                    method: "GET"
            }).then(results => {
				var resultData = (Array.isArray(results.value) ? results.value : []).map(result => ({
                    sfc: result.SFC,
                    sfcStatus: result.STATUS
                }));
                if(Array.isArray(resultData) && resultData.length === 0){
                    MessageToast.show(oBundle.getText("error.noAvailableSFCs.msg"));
                }else{
                    var oModel = new sap.ui.model.json.JSONModel({ sfcList: resultData });
                    oWebController.getView().setModel(oModel, "sfcValueHelpModel");
                    var oDialog = oWebController.byId("idSFCValueHelpDialog");
                    if (oDialog) {
                        oDialog.open();
                    } else {
                        console.error("Dialog with ID 'idSFCValueHelpDialog' not found.");
                    }
                }
            }).catch(error => {
				console.log("Extractor SFC API Error:", error);
                MessageToast.show(oBundle.getText("error.getSfcList.msg"));
            });
        },

        onSFCSearchValueHelp: function (oEvent) {
            const query = oEvent.getParameter("newValue").toLowerCase();
            const binding = oWebController.byId("idSFCValueHelpTable").getBinding("items");
            binding.filter(new sap.ui.model.Filter([
                new sap.ui.model.Filter("sfc", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("sfcStatus", sap.ui.model.FilterOperator.Contains, query)
            ], false));
        },

        onSFCValueHelpConfirm: function (oEvent) {
            const selectedItem = oEvent.getParameter("listItem");
            const selectedData = selectedItem.getBindingContext("sfcValueHelpModel").getObject();
            oWebController.getView().getModel("paramsModel").setProperty("/sfc", selectedData.sfc);
            oWebController.getView().getModel("paramsModel").setProperty("/operation", "");
            oWebController.getView().getModel("paramsModel").setProperty("/resource", "");
            oWebController.loadDCHistorianTable();
            oWebController.byId("idSFCValueHelpDialog").close();
        },

        onCancelSFCValueHelp: function () {
            oWebController.byId("idSFCValueHelpDialog").close();
        },

        // Operation Selection
        onOperValueHelpRequest: function(oEvent){
            var currentPlant = oWebController.getPodController().getUserPlant();
            var selectedSfc= oWebController.getView().getModel("paramsModel").getProperty("/sfc");
            if(selectedSfc){
                var oModel = new sap.ui.model.json.JSONModel();
                var sHeaders = {"DataServiceVersion":"2.0","Accept":"application/json"};
                var orderListApiUrl = oWebController.getPublicApiRestDataSourceUri() + "/sfc/v1/sfcdetail";
                oModel.loadData(
                    orderListApiUrl,
                    { "plant": currentPlant, "sfc": selectedSfc, "allRouterVersions": true },
                    true,
                    "GET",
                    null,
                    false,
                    sHeaders
                );
                oModel.attachRequestCompleted(function (oEvent) {
                    var oData = oEvent.getSource().oData;
                    var resultData = (Array.isArray(oData.steps) ? oData.steps : []).map(result => ({
                        operation: result.operation.operation,
                        operVersion:result.operation.version,
                        operDesc: result.operation.description,
                        workCenter: result.plannedWorkCenter
                    }));
                    if(Array.isArray(resultData) && resultData.length === 0){
                        MessageToast.show(oBundle.getText("error.noAvailableOperations.msg"));
                    }else{
                        var oModel = new sap.ui.model.json.JSONModel({ operList: resultData });
                        oWebController.getView().setModel(oModel, "operValueHelpModel");
                        var oDialog = oWebController.byId("idOperValueHelpDialog");
                        if (oDialog) {
                            oDialog.open();
                        } else {
                            console.error("Dialog with ID 'idOperValueHelpDialog' not found.");
                        }
                    }
                });
                oModel.attachRequestFailed(function (oEvent) {
                    MessageToast.show(oBundle.getText("error.getOperationList.msg"));
                    console.error("Failed to get sfcDetails API data:",
                        oEvent.getParameter("statusCode"),
                        oEvent.getParameter("statusText")
                    );
                });
            }else{
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
            }
        },

        onOperSearchValueHelp: function (oEvent) {
            const query = oEvent.getParameter("newValue").toLowerCase();
            const binding = oWebController.byId("idOperValueHelpTable").getBinding("items");
            binding.filter(new sap.ui.model.Filter([
                new sap.ui.model.Filter("operation", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("operVersion", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("operDesc", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("workCenter", sap.ui.model.FilterOperator.Contains, query)
            ], false));
        },

        onOperValueHelpConfirm: function (oEvent) {
            const selectedItem = oEvent.getParameter("listItem");
            const selectedData = selectedItem.getBindingContext("operValueHelpModel").getObject();
            oWebController.getView().getModel("paramsModel").setProperty("/operation", selectedData.operation);            
            oWebController.getView().getModel("paramsModel").setProperty("/operationVersion", selectedData.operVersion);            
            oWebController.getView().getModel("paramsModel").setProperty("/workCenter", selectedData.workCenter);
            oWebController.getView().getModel("paramsModel").setProperty("/resource", "");
            oWebController.loadDCHistorianTable();
            oWebController.byId("idOperValueHelpDialog").close();
        },

        onCancelOperValueHelp: function () {
            oWebController.byId("idOperValueHelpDialog").close();
        },

        // Resource Selection
        onRescValueHelpRequest: function(oEvent){
            var currentPlant = oWebController.getPodController().getUserPlant();
            var selectedSfc= oWebController.getView().getModel("paramsModel").getProperty("/sfc");
            if(selectedSfc){
                var workCenter= oWebController.getView().getModel("paramsModel").getProperty("/workCenter");
                if(workCenter){
                    var oModel = new sap.ui.model.json.JSONModel();
                    var sHeaders = {"DataServiceVersion":"2.0","Accept":"application/json"};
                    var orderListApiUrl = oWebController.getPublicApiRestDataSourceUri() + "/workcenter/v1/workcenters";
                    oModel.loadData(
                        orderListApiUrl,
                        { "plant": currentPlant, "workCenter": workCenter },
                        true,
                        "GET",
                        null,
                        false,
                        sHeaders
                    );
                    oModel.attachRequestCompleted(function (oEvent) {
                        var oData = oEvent.getSource().oData[0];
                        var resultData = (Array.isArray(oData.members) ? oData.members : [])
                            .filter(result => result.child && result.child.startsWith('ResourceBO:')) 
                            .map(result => ({
                                resource: result.childResource.resource,
                                rescStatus: result.childResource.status
                            }));
                        if(Array.isArray(resultData) && resultData.length === 0){
                            MessageToast.show(oBundle.getText("error.noAvailableResources.msg"));
                        }else{
                            var oModel = new sap.ui.model.json.JSONModel({ rescList: resultData });
                            oWebController.getView().setModel(oModel, "rescValueHelpModel");
                            var oDialog = oWebController.byId("idRescValueHelpDialog");
                            if (oDialog) {
                                oDialog.open();
                            } else {
                                console.error("Dialog with ID 'idRescValueHelpDialog' not found.");
                            }
                        }
                    });
                    oModel.attachRequestFailed(function (oEvent) {
                        MessageToast.show(oBundle.getText("error.getResourceList.msg"));
                        console.error("Failed to get retrieve work centers API data:",
                            oEvent.getParameter("statusCode"),
                            oEvent.getParameter("statusText")
                        );
                    });
                }else{
                    MessageToast.show(oBundle.getText("error.workCenterRequired.msg"));
                }
            }else{
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
            }
        },

        onRescSearchValueHelp: function (oEvent) {
            const query = oEvent.getParameter("newValue").toLowerCase();
            const binding = oWebController.byId("idRescValueHelpTable").getBinding("items");
            binding.filter(new sap.ui.model.Filter([
                new sap.ui.model.Filter("resource", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("rescStatus", sap.ui.model.FilterOperator.Contains, query)
            ], false));
        },

        onRescValueHelpConfirm: function (oEvent) {
            const selectedItem = oEvent.getParameter("listItem");
            const selectedData = selectedItem.getBindingContext("rescValueHelpModel").getObject();
            oWebController.getView().getModel("paramsModel").setProperty("/resource", selectedData.resource);
            oWebController.byId("idRescValueHelpDialog").close();
        },

        onCancelRescValueHelp: function () {
            oWebController.byId("idRescValueHelpDialog").close();
        },

        onValueHelpRequest: function (oEvent) {
            oWebController._oCurrentlyFocusedInput = oEvent.getSource();
            oWebController._oCurrentlyFocusedInputPath = oWebController._oCurrentlyFocusedInput.getBindingPath("value");
            const currentPlant = oWebController.getPodController().getUserPlant();
            const myDcGroupUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCParameterData; 
            oWebController.ajaxPostRequest(
                myDcGroupUrl,
                { plant: currentPlant, group: oWebController.reasonCodeConfigurationDCName },
                function (oDcGroupResponse) {
                    const dcData = oDcGroupResponse?.dcList?.[0];
                    if (!dcData) return;
                    const allParams = dcData.dcParameters || [];
                    const userLang = sap.ui.getCore().getConfiguration().getLanguage().substring(0, 2).toLowerCase();
                    var dcParams = allParams.filter(p => p.parameterPrompt?.toLowerCase() === userLang) 
                    if(dcParams.length === 0)
                        dcParams = allParams.filter(p => p.parameterPrompt?.toLowerCase() === "en");
                    const isGroupField = oWebController._oCurrentlyFocusedInput.getParent().getParent().getCells()[0].getText().toLowerCase().includes("group");
                    const selectedGroup = oWebController.getView().getModel("paramsModel").getProperty("/params")[0]?.parameterValue;
                    let valueHelpData = [];
                    if (isGroupField) {
                        oWebController._valueHelpContext = "GROUP";
                        const uniqueGroups = new Set();
                        dcParams.forEach(param => {
                            const group = param.description.split('-')[0].trim();
                            if (!uniqueGroups.has(group)) {
                                uniqueGroups.add(group);
                                valueHelpData.push({ Group: group, ReasonCode: "" });
                            }
                        });
                    } else if (selectedGroup) {
                        oWebController._valueHelpContext = "CODE_FILTERED";
                        dcParams.forEach(param => {
                            const [group, code] = param.description.split('-').map(s => s.trim());
                            if (group === selectedGroup) {
                                valueHelpData.push({ Group: group, ReasonCode: code });
                            }
                        });
                    } else {
                        oWebController._valueHelpContext = "CODE_ALL";
                        dcParams.forEach(param => {
                            const [group, code] = param.description.split('-').map(s => s.trim());
                            valueHelpData.push({ Group: group, ReasonCode: code });
                        });
                    }

                    const oValueHelpModel = new sap.ui.model.json.JSONModel({ ReasonGroups: valueHelpData });
                    oWebController.getView().setModel(oValueHelpModel, "valueHelpModel");

                    const oDialog = oWebController.byId("idValueHelpDialog");
                    const groupColumn = oWebController.byId("groupColumn");
                    const reasonColumn = oWebController.byId("reasonColumn");

                    groupColumn.setVisible(true);
                    reasonColumn.setVisible(true);

                    if (oWebController._valueHelpContext === "GROUP") {
                        reasonColumn.setVisible(false);
                    }

                    oDialog.open();
                },
                function (oError) {
                    console.error("DC Group API error:", oError);
                }
            );
        },

        onValueHelpConfirm: function (oEvent) {
            const selectedItem = oEvent.getParameter("listItem");
            const selectedData = selectedItem.getBindingContext("valueHelpModel").getObject();

            const params = oWebController.getView().getModel("paramsModel").getProperty("/params");

            if (oWebController._valueHelpContext === "GROUP") {
                params[0].parameterValue = selectedData.Group;
                params[1].parameterValue = "";
            } else {
                params[0].parameterValue = selectedData.Group;
                params[1].parameterValue = selectedData.ReasonCode;
            }

            oWebController.getView().getModel("paramsModel").setProperty("/params", params);
            oWebController.byId("idValueHelpDialog").close();
        },

        onClearPress:function(){
            const params = oWebController.getView().getModel("paramsModel").getProperty("/params");
            params[0].parameterValue = "";
            params[1].parameterValue = "";
            oWebController.getView().getModel("paramsModel").setProperty("/params", params);
            oWebController.getView().getModel("paramsModel").setProperty("/order", "");
            oWebController.getView().getModel("paramsModel").setProperty("/sfc", "");
            oWebController.getView().getModel("paramsModel").setProperty("/operation", "");
            oWebController.getView().getModel("paramsModel").setProperty("/resource", "");
            oWebController.getView().setModel(new JSONModel({dataList: []}), "dcHistorianModel");
        },

        onCancelValueHelp: function () {
            oWebController.byId("idValueHelpDialog").close();
        },

        onSearchValueHelp: function (oEvent) {
            const query = oEvent.getParameter("newValue").toLowerCase();
            const binding = oWebController.byId("idValueHelpTable").getBinding("items");

            binding.filter(new sap.ui.model.Filter([
                new sap.ui.model.Filter("Group", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("ReasonCode", sap.ui.model.FilterOperator.Contains, query)
            ], false));
        },

        onCollectPress: function () {
            var currentModel = oWebController.getView().getModel("paramsModel");
            var currentData = currentModel.getData();
            var currentSfc = currentData.sfc;
            var operation = currentData.operation;
            var operationVersion = currentData.operationVersion;
            var selectedResource = currentData.workCenter;
            var currentPlant = oWebController.getPodController().getUserPlant();
            var dcGroup = currentData.group;
            var currentVersion = currentData.version;
            var params = currentData.params;

            if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }
            if(!operation){
                MessageToast.show(oBundle.getText("error.operationRequired.msg"));
                return;
            }
            // if(!selectedResource){
            //     MessageToast.show(oBundle.getText("error.resourceRequired.msg"));
            //     return;
            // }
            var isValid = params.every(function (param) {
                return param.parameterValue && param.parameterValue.toString().trim() !== "";
            });
            if (!isValid) {
                MessageToast.show(oBundle.getText("error.missingParams.msg"));
                return;
            }

            var parameterValues = params.map(function (param) {
                return {
                    name: param.name,
                    value: param.parameterValue
                };
            });
            var myDcGroupUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyLogDC;

            var requestBody = {
                resource: selectedResource,
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
                    console.log("Response of the Re-Log Complete Reason Code DPP:", oResponseData);
                    const params = oWebController.getView().getModel("paramsModel").getProperty("/params");
                    params[0].parameterValue = "";
                    params[1].parameterValue = "";
                    oWebController.getView().getModel("paramsModel").setProperty("/params", params);
                    currentModel.refresh(true);
                    oWebController.loadDCHistorianTable();
                    MessageToast.show(oBundle.getText("success.reasonCodesLogged.msg"));
                },
                function (oError, sHttpErrorMessage) {                    
                    MessageToast.show(oBundle.getText("error.relogReasonCodes.msg"));
                    console.error("Error during API call:", oError || sHttpErrorMessage);
                }
            );
        },

        onInputChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var newValue = oInput.getValue();
            var oContext = oInput.getBindingContext();
            var sPath = oContext.getPath();
            var oModel = oContext.getModel();
            oModel.setProperty(sPath + "/parameterValue", newValue);
            console.log("Updated parameter:", sPath, "=", newValue);
        },

        onDialogClose: function () {
            var oModel = oWebController.getView().getModel();
            var paramsData = oModel.getProperty("/params");
            paramsData.forEach(function (param) {
                param.parameterValue = "";
            });
            oModel.setProperty("/params", paramsData);
            oModel.refresh(true);
            oWebController.byId("parameterTable11").close();
        },

        onViewClose: function (oEvent) {
            this.byId("viewParameter").close();
        },

        onBeforeRenderingPlugin: function () {
            // Your logic for onBeforeRenderingPlugin
        },

        isSubscribingToNotifications: function () {
            var bNotificationsEnabled = true;
            return bNotificationsEnabled;
        },

        getCustomNotificationEvents: function (sTopic) {
            // return ["template"];
        },

        getNotificationMessageHandler: function (sTopic) {
            // if (sTopic === "template") {
            //     return this._handleNotificationMessage;
            // }
            return null;
        },

        _handleNotificationMessage: function (oMsg) {
            var sMessage = "Message not found in payload 'message' property";
            if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
                for (var i = 0; i < oMsg.parameters.length; i++) {
                    switch (oMsg.parameters[i].name) {
                        case "template":
                            break;
                        case "template2":
                            break;
                    }
                }
            }
        },

        onExit: function () {
            PluginViewController.prototype.onExit.apply(this, arguments);
        }
    });
});