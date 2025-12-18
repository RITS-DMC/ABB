var oWebController, oBundle, oConfirmDialog,currentPlant, currentSfc, quantity, currentOperationsData , operation, operationVersion, currentResource, workCenter, currentRoutingStepsData, routing, routingVersion, order, completedQty;
sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (jQuery, PluginViewController, JSONModel, MessageToast) {
	"use strict";

	return PluginViewController.extend("abb.views.customComplete.customCompletePlugin.customCompletePlugin.controller.MainView", {
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
            this.onAfterRendering1();
        },

        onAfterRendering1: function () {

            currentPlant = oWebController.getPodController().getUserPlant();
            currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            operation = currentOperationsData[0]?.operation;
            operationVersion = currentOperationsData[0]?.version;
            currentResource = oWebController.getPodSelectionModel().resource.resource;
            workCenter = oWebController.getPodController()?.getPodSelectionModel()?.workCenter;
            currentRoutingStepsData = oWebController.getPodController()?.getPodSelectionModel()?.getSelectedRoutingSteps();
            routing = currentRoutingStepsData[0]?.routing;
            routingVersion = currentRoutingStepsData[0]?.routingVersion;
            order = oWebController.getPodController().getPodSelectionModel().getSelectedWorklistOperations()[0]?.shopOrder;
            
            oWebController.getView().byId("closeButton").setVisible(oWebController.getConfiguration().closeButtonVisible);
            oWebController.getView().byId("headerTitle").setText(oBundle.getText(oWebController.getConfiguration().title));

            //Reading Plugin Properties Data
            oWebController.reasonCodeDCName = oWebController.getConfiguration().reasonCodeDCName;
            oWebController.reasonCodeDCVersion = oWebController.getConfiguration().reasonCodeDCVersion;
            oWebController.reasonCodeConfigurationDCName = oWebController.getConfiguration().reasonCodeConfigurationDCName;
            oWebController.onOpenDialogConf();
        },

        onOpenDialogConf: function(){
            var podSelectionQty = oWebController.getPodController().getPodSelectionModel().quantity;
            var sfcInWorkQty = oWebController.getPodController().getPodSelectionModel().operations[0]?.quantityInWork;
            quantity = 0;
            if(podSelectionQty !== undefined && podSelectionQty !== 0 && podSelectionQty !== null && podSelectionQty !== ''){
                if(podSelectionQty > sfcInWorkQty){
                    MessageToast.show(oBundle.getText("error.podQtyExceedsSfcInWork.msg"));                    
                    oWebController.onClosePress();
                }else{
                    quantity = podSelectionQty;
                }
            }else{
                quantity = sfcInWorkQty;
            }
            completedQty = oWebController.getPodController().getPodSelectionModel().operations[0]?.quantityComplete + sfcInWorkQty;
            var message = oBundle.getText("dialog.completeSfc.msg",[currentSfc,quantity]);
            if(quantity !== undefined && quantity !== 0){
                if(!oConfirmDialog){
                    oConfirmDialog = new sap.m.Dialog("idConfirmDialog", {
                        title: oBundle.getText("dialog.confirmation.title"),
                        type: 'Message',
                        content: new sap.m.Text({
                            text: message
                        }),
                        beginButton: new sap.m.Button({
                            text: oBundle.getText("button.yes.text"),
                            type: "Emphasized",
                            icon: "sap-icon://begin",
                            press: function () {
                                oWebController.checkCTForOpenDialog();//callCompleteSfc(quantity);
                            }
                        }),
                        endButton: new sap.m.Button({
                            text: oBundle.getText("button.no.text"),
                            type: "Default",
                            icon: "sap-icon://sys-cancel",
                            press: function () {
                                oConfirmDialog.close();
                                oConfirmDialog.destroy();
                                oConfirmDialog = null;
                                oWebController.onClosePress();
                            }
                        })
                        // ,
                        // afterClose: function () {
                        //     oConfirmDialog.destroy();
                        // }
                    });
                    oConfirmDialog.open();
                }
            }
            
        },

        callCompleteSfc: function(){
            // oConfirmDialog.close();
            // oConfirmDialog.destroy();
            // oConfirmDialog = null;
            // var currentPlant = oWebController.getPodController().getUserPlant();
            // var currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            // var currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            // var operation = currentOperationsData[0]?.operation;
            // var currentResource = oWebController.getPodSelectionModel().resource.resource;

            // var podSelectionQty = oWebController.getPodController().getPodSelectionModel().quantity;
            // var sfcInWorkQty = oWebController.getPodController().getPodSelectionModel().operations[0]?.quantityInWork;
            // var quantity = 0;
            // if(podSelectionQty !== undefined && podSelectionQty !== 0){
            //     if(podSelectionQty > sfcInWorkQty){
            //         MessageToast.show(oBundle.getText("error.podQtyExceedsSfcInWork.msg"));                    
            //         oWebController.onClosePress();
            //     }else{
            //         quantity = podSelectionQty;
            //     }
            // }else{
            //     quantity = sfcInWorkQty;
            // }
			var completeSfcUrl = this.getPublicApiRestDataSourceUri() 
            + "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyCompleteSFC;
			this.ajaxPostRequest(
                completeSfcUrl,
                { plant: currentPlant, sfc: currentSfc, operation: operation, resource: currentResource, quantity: quantity},
                function (oCompleteSfcResponse) {
                    if(oCompleteSfcResponse?.outResponse){
						oWebController.checkCTForOpenDialog();
					}
                },
                function (oError) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
						MessageToast.show(oBundle.getText("error.sfcCompleting.msg",[sErrorMsg]));
					}
                    console.error("While call Complete SFC error:", oError);
                }
            );
		},

        checkCTForOpenDialog:function(){
            oConfirmDialog.close();
            oConfirmDialog.destroy();
            oConfirmDialog = null;
            var that = oWebController;
            // var currentSfc = that.getPodController().getPodSelectionModel().inputValue;
            // var currentOperationsData = that.getPodController().getPodSelectionModel().operations;
            // var operation = currentOperationsData[0]?.operation;
            // var operationVersion = currentOperationsData[0]?.version;
            // var workCenter = that.getPodController()?.getPodSelectionModel()?.workCenter;
            // var currentPlant = that.getPodController().getUserPlant();
            // var routing = that.getPodController()?.getPodSelectionModel()?.getSelectedRoutingSteps()[0]?.routing;
            // var routingVersion = that.getPodController()?.getPodSelectionModel()?.getSelectedRoutingSteps()[0]?.routingVersion;
            var checkCTCompUrl = that.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyCheckCycleTimeComplete;
            that.ajaxPostRequest(
                checkCTCompUrl,
                { IN_PLANT: currentPlant, IN_SFC: currentSfc, IN_WC: workCenter, IN_OPERATION_ACTIVITY: operation, IN_OPERATION_VERSION: operationVersion, IN_ROUTING: routing, IN_ROUTING_VERSION: routingVersion, IN_ORDER: order,IN_CMPL_QTY: completedQty},
                function (oCheckCTCompResponse) {
                    var actualCycleTime = oCheckCTCompResponse.OUT_ACTUAL_CT;
                    var showPlugin = oCheckCTCompResponse.OUT_SHOW_PLUGIN;
                    var standardCycleTime = oCheckCTCompResponse.OUT_STND_CT;
                    if(showPlugin){
                        that._dcGroupData(that);
                    }else{
                        oWebController.callCompleteSfc();
                        that.onClosePress();
                    }
                },
                function (oError) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
						MessageToast.show(oBundle.getText("error.compareCycleTime.msg",[sErrorMsg]));
					}
                    console.error("Error during Check CT Completion API call:", oError);
                }
            );
        },

        _dcGroupData: function (that) {
            //var currentPlant = that.getPodController().getUserPlant();
            var myDcGroupUrl = that.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCParameterData;

            that.ajaxPostRequest(
                myDcGroupUrl,
                { plant: currentPlant, group: that.reasonCodeDCName },
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
                        params: tableData
                    });

                    that.getView().setModel(oModel, "paramsModel");
                    console.log("Final bound model:", oModel.getData());
                },
                function (oError, sHttpErrorMessage) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
						MessageToast.show(oBundle.getText("error.getConfiguredCompleteReasonCodeDCDetails.msg",[sErrorMsg]));
					}
                    console.error("Error during DC Group API call:", oError || sHttpErrorMessage);
                });
        },

        onValueHelpRequest: function (oEvent) {
            this._oCurrentlyFocusedInput = oEvent.getSource();
            this._oCurrentlyFocusedInputPath = this._oCurrentlyFocusedInput.getBindingPath("value");

            //const currentPlant = this.getPodController().getUserPlant();
            const myDcGroupUrl = this.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCParameterData; 
            this.ajaxPostRequest(
                myDcGroupUrl,
                { plant: currentPlant, group: this.reasonCodeConfigurationDCName },
                function (oDcGroupResponse) {
                    const dcData = oDcGroupResponse?.dcList?.[0];
                    if (!dcData) return;
                    const allParams = dcData.dcParameters || [];
                    const userLang = sap.ui.getCore().getConfiguration().getLanguage().substring(0, 2).toLowerCase();
                    var dcParams = allParams.filter(p => p.parameterPrompt?.toLowerCase() === userLang) 
                    if(dcParams.length === 0)
                        dcParams = allParams.filter(p => p.parameterPrompt?.toLowerCase() === "en");
                    const isGroupField = this._oCurrentlyFocusedInput.getParent().getParent().getCells()[0].getText().toLowerCase().includes("group");
                    const selectedGroup = this.getView().getModel("paramsModel").getProperty("/params")[0]?.parameterValue;

                    let valueHelpData = [];

                    if (isGroupField) {
                        this._valueHelpContext = "GROUP";
                        const uniqueGroups = new Set();
                        dcParams.forEach(param => {
                            const group = param.description.split('-')[0].trim();
                            if (!uniqueGroups.has(group)) {
                                uniqueGroups.add(group);
                                valueHelpData.push({ Group: group, ReasonCode: "" });
                            }
                        });
                    } else if (selectedGroup) {
                        this._valueHelpContext = "CODE_FILTERED";
                        dcParams.forEach(param => {
                            const [group, code] = param.description.split('-').map(s => s.trim());
                            if (group === selectedGroup) {
                                valueHelpData.push({ Group: group, ReasonCode: code });
                            }
                        });
                    } else {
                        this._valueHelpContext = "CODE_ALL";
                        dcParams.forEach(param => {
                            const [group, code] = param.description.split('-').map(s => s.trim());
                            valueHelpData.push({ Group: group, ReasonCode: code });
                        });
                    }

                    const oValueHelpModel = new sap.ui.model.json.JSONModel({ ReasonGroups: valueHelpData });
                    this.getView().setModel(oValueHelpModel, "valueHelpModel");

                    const oDialog = this.byId("idValueHelpDialog");
                    const groupColumn = this.byId("groupColumn");
                    const reasonColumn = this.byId("reasonColumn");

                    groupColumn.setVisible(true);
                    reasonColumn.setVisible(true);

                    if (this._valueHelpContext === "GROUP") {
                        reasonColumn.setVisible(false);
                    }

                    oDialog.open();
                }.bind(this),
                function (oError) {
                    console.error("DC Group API error:", oError);
                }.bind(this)
            );
        },


        onValueHelpConfirm: function (oEvent) {
            const selectedItem = oEvent.getParameter("listItem");
            const selectedData = selectedItem.getBindingContext("valueHelpModel").getObject();

            const params = this.getView().getModel("paramsModel").getProperty("/params");

            if (this._valueHelpContext === "GROUP") {
                params[0].parameterValue = selectedData.Group;
                params[1].parameterValue = "";
            } else {
                params[0].parameterValue = selectedData.Group;
                params[1].parameterValue = selectedData.ReasonCode;
            }

            this.getView().getModel("paramsModel").setProperty("/params", params);
            this.byId("idValueHelpDialog").close();
        },

        onClearPress:function(){
            const params = this.getView().getModel("paramsModel").getProperty("/params");
            params[0].parameterValue = "";
            params[1].parameterValue = "";
            this.getView().getModel("paramsModel").setProperty("/params", params);
        },

        onCancelValueHelp: function () {
            this.byId("idValueHelpDialog").close();
        },
        onSearchValueHelp: function (oEvent) {
            const query = oEvent.getParameter("newValue").toLowerCase();
            const binding = this.byId("idValueHelpTable").getBinding("items");

            binding.filter(new sap.ui.model.Filter([
                new sap.ui.model.Filter("Group", sap.ui.model.FilterOperator.Contains, query),
                new sap.ui.model.Filter("ReasonCode", sap.ui.model.FilterOperator.Contains, query)
            ], false));
        },

        onCollectPress: function () {
            var currentModel = oWebController.getView().getModel("paramsModel");
            var currentData = currentModel.getData();
            // var currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            // var currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            // var operation = currentOperationsData[0]?.operation;
            // var operationVersion = currentOperationsData[0]?.version;
            // var currentResource = oWebController.getPodSelectionModel().resource.resource;
            // var currentPlant = oWebController.getPodController().getUserPlant();

            var dcGroup = currentData.group;
            var currentVersion = currentData.version;
            var params = currentData.params;

            var isValid = params.every(function (param) {
                return param.parameterValue && param.parameterValue.toString().trim() !== "";
            });
            if (!isValid) {
                MessageToast.show(oBundle.getText("error.missingParameterValues.msg"));
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
                    console.log("Response of the Log Complete Reason Code DPP:", oResponseData);
                    oWebController.callCompleteSfc();
                    oWebController.onClosePress();
                    MessageToast.show(oBundle.getText("success.completeReasonCodesLogged.msg"));
                },
                function (oError, sHttpErrorMessage) {
                    MessageToast.show(oBundle.getText("error.loggingCompleteReasonCodes.msg"));
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
            var oModel = this.getView().getModel();
            var paramsData = oModel.getProperty("/params");
            paramsData.forEach(function (param) {
                param.parameterValue = "";
            });
            oModel.setProperty("/params", paramsData);
            oModel.refresh(true);
            this.byId("parameterTable11").close();
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