sap.ui.define([
    'jquery.sap.global',
    "sap/dm/dme/podfoundation/controller/PluginViewController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (jQuery, PluginViewController, JSONModel, MessageToast, MessageBox) {
	"use strict";
    let sfc;
    let plant;
    let customValues;
    let order;
    let resource;
    let operation;
    let sel_length;
    let urlpp = "";
    return PluginViewController.extend("abb.views.customChecklist.modpUSChecklistPlugin.modpUSChecklistPlugin.controller.MainView", {
        onInit: function () {

            if (PluginViewController.prototype.onInit) {
                PluginViewController.prototype.onInit.apply(this, arguments);
            }
            this.localModel = new sap.ui.model.json.JSONModel({
                readOnlyMode: false // or false based on logic
            });
            this.getView().setModel(this.localModel, "localModel");
            this.lastOperationValue = null;


        },

   onAfterRendering: function () {

            this.getView().byId("backButton").setVisible(this.getConfiguration().backButtonVisible);
            this.getView().byId("closeButton").setVisible(this.getConfiguration().closeButtonVisible);

            

        },

        onBeforeRenderingPlugin: function () {



        },
        
        handleStatusAction: function (status, data) {
            const urlpp = this.getPublicApiRestDataSourceUri() + "/pe/api/v1/process/processDefinitions/start?async=false&key="+this.getConfiguration().keyLogDataCollection


            const parameters = {
                inDC: data.DcGroup,
                inOp: operation,
                inOpVersion: "ERP001",
                inPlant: plant,
                inResource: resource,
                inSFC: sfc,
                inStatus: status
            };

            const that = this;
            const currentUserId = that.getPodController().getUserId();
            const originalStatus = data.DcParameterValue;

            that.ajaxPostRequest(
                urlpp,
                parameters,
                function (response) { // success
                    if (response.out_success === false) {
                        MessageToast.show("Unable to collect the data");
                        return;
                    }

                    const oModel = that.getView().getModel("localModel");
                    const allData = oModel.getProperty("/results");
                    const index = allData.findIndex(item => item.DcGroup === data.DcGroup);

                    if (index === -1) {
                        MessageToast.show("Row not found for update.");
                        return;
                    }

                    // Preserve unchanging fields
                    const updatedRow = { ...allData[index] };
                    updatedRow.DcParameterValue = status;
                    updatedRow.IsFinal = false;

                    // Fetch latest values from API
                    const sUrl = that.getPublicApiRestDataSourceUri() + "dmci/v4/extractor/DATA_COLLECTION";
                    const oData = {
                        "$filter": `SFC eq '${sfc}' and PLANT eq '${plant}' and DC_GROUP eq '${data.DcGroup}' and DC_PARAMETER_NAME eq '${data.DcParameterName}'`,
                        "$format": "json"
                    };

                    $.ajax({
                        url: sUrl,
                        data: oData,
                        method: "GET"
                    }).then(result => {
                        const now = new Date();
                        updatedRow.LastUpdatedAt = moment(now).format("MM/DD/YYYY HH:mm:ss");
                        updatedRow.UserId = that.getUserId()

                        // CrossCheck status logic
                        if (status !== "NOT COLLECTED" && updatedRow.CrossCheckStatus !== "NOT APPLICABLE") {
                            updatedRow.CrossCheckStatus = "";
                            updatedRow.CrossCheckedBy = "";
                            updatedRow.CrossCheckTime = "";
                        }
                        if (updatedRow.Rule.toUpperCase() === "MANDATORY") {
                            if (updatedRow.DcParameterValue === "PASS") {
                                updatedRow.DcParameterValue = "M-PASS-COLLECTED";
                            } else if (updatedRow.DcParameterValue === "FAIL") {
                                updatedRow.DcParameterValue = "M-FAIL-COLLECTED";

                            } else {
                                updatedRow.DcParameterValue = "NOT COLLECTED";
                            }
                        }
                        if (updatedRow.Rule.toUpperCase() === "OPTIONAL") {
                            if (updatedRow.DcParameterValue === "PASS") {
                                updatedRow.DcParameterValue = "O-PASS-COLLECTED";
                            } else if (updatedRow.DcParameterValue === "FAIL") {
                                updatedRow.DcParameterValue = "O-FAIL-COLLECTED";
                            }
                            else {
                                updatedRow.DcParameterValue = "NOT COLLECTED";
                            }
                        }

                        updatedRow.CrossCheckDisabled = !(status === "PASS" && updatedRow.CrossCheckStatus !== "NOT APPLICABLE");

                        allData[index] = updatedRow;
                        oModel.setProperty("/results", allData);
                        oModel.refresh(true);

                        MessageToast.show("Status updated successfully");
                    }).catch(error => {
                        console.log("Extractor API Error:", error);
                        MessageToast.show("Data updated, but could not fetch latest info.");
                    });

                },
                function (error) { // error
                    console.log("Data Collection Error:", error);
                    MessageToast.show("Unable to collect the data due to error: " + error);

                    const oModel = that.getView().getModel("localModel");
                    const allData = oModel.getProperty("/results");
                    const index = allData.findIndex(item => item.DcGroup === data.DcGroup);

                    if (index !== -1) {
                        allData[index].DcParameterValue = originalStatus;
                        oModel.setProperty("/results", allData);
                        oModel.refresh(true);
                    }
                }
            );
        },
        onBeforeRenderingPlugin: function () {
            this.subscribe("OperationListSelectEvent", this.onOperationChangeEvent, this);
            this.subscribe("WorklistSelectEvent", this.onWorkListSelectEvent, this);
            sel_length = this.getPodController().getPodSelectionModel().selections.length;
            let data_sfc = this.getPodSelectionModel().getInputValue();
            let data_op = this.getPodSelectionModel()?.getOperation()?.operation;

            if (!data_sfc || !data_op || sel_length === 0) {
                this.localModel.setData({ data: [] });
                this.localModel.refresh(true);
                this.lastOperationValue = null;
                return;
            }

            if (this.getConfiguration().Checklist_Type === "Checklist - Read Only") {
                this.getView().byId("statusIcon").setVisible(true);
                this.getView().byId("statusBox").setVisible(false);
                this.getView().byId("ccIcon1").setVisible(false);
                this.getView().byId("ccIcon2").setVisible(true);
                this.getView().byId("ccBox").setVisible(false);
            }
            this.dcDataDisplay(data_sfc, data_op);

        },



        onBeforeRendering: function () {

        },

        onWorkListSelectEvent: function (sChannelId, sEventId, oData) {
            sel_length = this.getPodController().getPodSelectionModel().selections.length;
            let data_sfc = this.getPodSelectionModel().getInputValue();
            let data_op = this.getPodSelectionModel()?.getOperation()?.operation;
            if (!data_sfc || !data_op || sel_length === 0) {
                this.localModel.setData({ data: [] });
                this.localModel.refresh(true);
                this.lastOperationValue = null;
            }
            else {
                this.dcDataDisplay(data_sfc, data_op);
            }
        },

        onOperationChangeEvent: function (sChannelId, sEventId, oData) {
            if (this.isEventFiredByThisPlugin(oData)) {
                this.localModel.setData({ data: [] });
                this.localModel.refresh(true);
                this.lastOperationValue = null;
                return;
            }
            sel_length = this.getPodController().getPodSelectionModel().selections.length;
            let data_sfc = this.getPodSelectionModel().getInputValue();
            let data_op = this.getPodSelectionModel()?.getOperation()?.operation;
            if (!data_sfc || !data_op || sel_length === 0) {
                this.localModel.setData({ data: [] });
                this.localModel.refresh(true);
                this.lastOperationValue = null;
                return;
            }
            else {
                this.dcDataDisplay(data_sfc, data_op);
            }

            if (this.lastOperationValue === data_op) {
                return;
            }
            this.lastOperationValue = data_op;
        },

        onAfterRendering: function () {
        },

        dcDataDisplay: function (d1, d2) {
            operation = d2;
            const orderCustomData=this.getPodSelectionModel().getSelection();
            customValues = [{"attribute":"PROD_TYPE","value":orderCustomData.customFields["SHOP_ORDER.PROD_TYPE"]},{"attribute":"PROD_FAMILY","value":orderCustomData.customFields["SHOP_ORDER.PROD_FAMILY"]}, {attribute:"FRAME_SIZE","value":orderCustomData.customFields["SHOP_ORDER.FRAME_SIZE"]},{"attribute":"PROD_FAMILY","value":orderCustomData.customFields["SHOP_ORDER.PROD_FAMILY"]}, {attribute:"PLUS_CODE","value":orderCustomData.customFields["SHOP_ORDER.PLUS_CODE"]}];
            order = this.getPodController().getPodSelectionModel().selections[0].shopOrder.shopOrder;
            sfc = d1;
            plant = this.getPodController().getUserPlant();
            resource = this.getPodController().getPodSelectionModel().resource.resource;
            // urlpp = this.getPublicApiRestDataSourceUri() + "/pe/api/v1/process/processDefinitions/start?async=false&key=REG_f5f1c793-c964-4490-8503-cdea6ef80d34"
            urlpp = this.getPublicApiRestDataSourceUri() + "/pe/api/v1/process/processDefinitions/start?async=false&key="+this.getConfiguration().keyDatacollectionList;
            let parameters = {
                inActivityRef: operation,
                inCustomValues: customValues,
                inOperVersion: this.getPodSelectionModel().getOperation().version,
                inOrder: order,
                inPlant: plant,
                inResource: resource,
                inSfc: sfc
            };
            let that = this;
            that.ajaxPostRequest(
                urlpp,
                parameters,
                function (data) { // success
                    console.log("ChecklistStatus Success:", data);
                    if (!data.outErrMsg && data.outDC1!= null) {
                        const showColumn = data.outDC1.some(item => item.columnCrossCheck === true);
                        const readOnly = that.getConfiguration().Checklist_Type === "Checklist - Read Only";
                        that.getView().getModel("localModel").setProperty("/readOnlyMode", readOnly);
                        


                    that.getView().byId("dataCollectionTable").getColumns()[4].setVisible(showColumn)
                    that.getView().byId("dataCollectionTable").getColumns()[5].setVisible(showColumn)
                    that.getView().byId("dataCollectionTable").getColumns()[6].setVisible(showColumn)
                    that.getView().byId("dataCollectionTable").getColumns()[8].setVisible(showColumn)

                     let currentData = { results: data.outDC1 };
                    that.localModel.setData(currentData);
                    that.localModel.refresh(true);
               
                    }
                    else {
                        let filteredData = [];
                        let currentData = { results: filteredData };

                        that.localModel.setData(currentData);
                        that.localModel.refresh(true);
                        that.onClosePress();
                    }
                },
                function (error) { // error
                    console.log("ChecklistStatus Error:", error);
                    //MessageToast.show("Unable to retrieve ChecklistStatus data.");
                    let filteredData = [];
                    let currentData = { results: filteredData };

                    that.localModel.setData(currentData);
                    that.localModel.refresh(true);
                    that.onClosePress();
                }
            );
        },

        ajaxPostRequest: function (url, parameters, successCallback, errorCallback) {
            $.ajax({
                url: url,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(parameters),
                success: function (data) {
                    if (typeof successCallback === "function") {
                        successCallback(data);
                    }
                },
                error: function (xhr, status, error) {
                    console.log("POST Error:", error);
                    if (typeof errorCallback === "function") {
                        errorCallback(error);
                    }
                }
            });
        },

      
            

                   
    

        onStatusIconPress: function (oEvent) {

            //if (this.getPodSelectionModel().getSelection().sfcData.statusCode === "403") {
                const oButton = oEvent.getSource();
                const oContext = oButton.getBindingContext("localModel");
                const oObject = oContext.getObject();

                // Get icon and map it to the corresponding status
                const sIcon = oButton.getIcon();
                let sNewStatus = "";

                switch (sIcon) {
                    case "sap-icon://status-completed":
                        sNewStatus = "PASS";
                        break;
                    case "sap-icon://decline":
                        sNewStatus = "FAIL";
                        break;
                    case "sap-icon://appear-offline":
                        sNewStatus = "NOT COLLECTED";
                        break;
                }


                this.handleStatusAction(sNewStatus, oObject);


            // }
            // else {
            //     MessageToast.show("Please start the SFC");
            // }
        },
        convertToISODate: function (dateString) {
            if (!dateString) return "";
            try {
                if (typeof dateString !== 'string') {
                    dateString = dateString.toString();
                }
                let d = new Date(parseInt(dateString.replace("/Date(", "").replace(")/", "")));
                return d.toISOString().replace("T", " ").substring(0, 19);
            } catch (e) {
                console.log("Invalid date:", dateString);
                return "";
            }
        },
       
       

        onCrossCheck: async function (oEvent) {
            const sfc_status = this.getPodController().getPodSelectionModel().getOperation().status;
            let getEvent = oEvent.getSource();
            let oData = getEvent.getBindingContext("localModel").getObject();
            let path = getEvent.getBindingContext("localModel").getPath();
            console.log(oData);

            const originalBadgeId = await oData.UserId;
            const currentUserId = this.getPodController().getUserId();
            //  const currentBadgeId = await this.getUserBadgeID(currentUserId);

            if (!originalBadgeId || originalBadgeId === currentUserId) {
                MessageToast.show("Cross-check must be performed by a different user.");
                return;
            }

            urlpp = this.getPublicApiRestDataSourceUri() + "/pe/api/v1/process/processDefinitions/start?async=false&key="+this.getConfiguration().keyCrosscheck
            let parameters = {
                inDc: oData.DcGroup,
                inDcParam: oData.Description,
                inOper: operation,
                inOperVersion: "ERP001",
                inPlant: plant,
                inResource: resource,
                inSfc: sfc
            };
            let that = this;
            that.ajaxPostRequest(
                urlpp,
                parameters,
                function (data) { // success
                    console.log("Crosscheck Status Success:", data);
                    if (!data.out_CC_DC) {
                        MessageToast.show("Invalid crosschecking as no cross check DC is there.");
                        return;
                    }

                    if (data.out_log_DC === false) {
                        MessageToast.show(data.outErr || "Cross-checking not allowed.");
                        return;
                    }

                    let sUrl = that.getPublicApiRestDataSourceUri() + "dmci/v4/extractor/DATA_COLLECTION";
                    let oDataParams = {
                        "$filter": `SFC eq '${sfc}' and PLANT eq '${plant}' and DC_GROUP eq '${oData.DcGroup}'`,
                        "$format": "json"
                    };
                    $.ajax({
                        url: sUrl,
                        data: oDataParams,
                        method: "GET",
                        success: function (result) {
                            if (Array.isArray(result.value) && result.value.length > 0) {
                                /*const latest = result.value.reduce((prev, curr) =>
                                    new Date(curr.LAST_UPDATED_AT) > new Date(prev.LAST_UPDATED_AT) ? curr : prev
                                );*/
                                const now = new Date();
                                const updatedData = {
                                    ...oData,
                                    CrossCheckStatus: "VERIFIED",
                                    CrossCheckedBy: currentUserId,
                                    CrossCheckTime: moment(now).format("MM/DD/YYYY HH:mm:ss"),
                                    CrossCheckDisabled: true
                                };
                                that.localModel.setProperty(path, updatedData);
                                that.localModel.refresh(true);
                            } else {
                                MessageToast.show("No data found for cross-check.");
                            }
                        },
                        error: function () {
                            MessageToast.show("Failed to retrieve latest data for cross-check.");
                        }
                    });
                },
                function (error) { // error
                    console.log("ChecklistStatus Error:", error);
                    MessageToast.show("Unable to retrieve ChecklistStatus data.");
                }
            );
            //Bug:46199 - Commented the below code as Crosscheck should be allowed irrespective of SFC status - by Rushali
            /*else {
                MessageToast.show("Please start the SFC");
            }*/
        },


        onRefresh: function () {
            this.dcDataDisplay(sfc, operation);
        },



       

        onExit: function () {
            if (PluginViewController.prototype.onExit) {
                PluginViewController.prototype.onExit.apply(this, arguments);
            }
            this.unsubscribe("WorklistSelectEvent", this.onWorkListSelectEvent, this);
            this.unsubscribe("OperationListSelectEvent", this.onOperationChangeEvent, this);


        }
    });
});