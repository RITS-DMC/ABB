var oWebController, oBundle;
sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (jQuery, PluginViewController, JSONModel, MessageToast) {
	"use strict";

	return PluginViewController.extend("abb.views.custom.customSignOffPlugin.customSignOffPlugin.controller.MainView", {
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
            var currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            var currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            var operation = currentOperationsData[0]?.operation;
            var currentPlant = oWebController.getPodController().getUserPlant();
            var currentResource = oWebController.getPodSelectionModel().resource.resource;
            var currentWorkCenter = oWebController.getPodSelectionModel().workCenter;
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
            var getDCGroupDetailUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCParameterData;

            oWebController.ajaxPostRequest(
                getDCGroupDetailUrl,
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
                        params: tableData
                    });

                    oWebController.getView().setModel(oModel, "paramsModel");
                    console.log("Final bound model:", oModel.getData());
                },
                function (oError, sHttpErrorMessage) {
                    console.error("Error during DC Group API call:", oError || sHttpErrorMessage);
                });
        },

        onValueHelpRequest: function (oEvent) {
            oWebController._oCurrentlyFocusedInput = oEvent.getSource();
            oWebController._oCurrentlyFocusedInputPath = oWebController._oCurrentlyFocusedInput.getBindingPath("value");

            const currentPlant = oWebController.getPodController().getUserPlant();
            const getParamDataUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyGetDCParameterData; 
            oWebController.ajaxPostRequest(
                getParamDataUrl,
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
            var currentSfc = oWebController.getPodController().getPodSelectionModel().inputValue;
            var currentOperationsData = oWebController.getPodController().getPodSelectionModel().operations;
            var operation = currentOperationsData[0]?.operation;
            var operationVersion = currentOperationsData[0]?.version;
            var selectedResource = oWebController.getPodSelectionModel().resource.resource;
            var currentPlant = oWebController.getPodController().getUserPlant();

            var dcGroup = currentData.group;
            var currentVersion = currentData.version;
            var params = currentData.params;

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
            var logDCUrl = oWebController.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?async=false&key="+oWebController.getConfiguration().keyLogDCAndSignoff;

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
                logDCUrl,
                requestBody,
                function (oResponseData) {
                    console.log("Response of the Log Signoff Reason Code DPP:", oResponseData);
                    params.forEach(function (param, index) {
                        var path = "/params/" + index + "/parameterValue";
                        currentModel.setProperty(path, "");
                    });
                    currentModel.refresh(true);
                    oWebController.onClosePress();
                    MessageToast.show(oBundle.getText("success.reasonCodesLogged.msg"));
                },
                function (oError, sHttpErrorMessage) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
                        MessageToast.show(oBundle.getText("error.reasonCodesLogging.msg",[sErrorMsg]));
					}
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