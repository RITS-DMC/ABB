var oWebController, oBundle;
sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (jQuery, PluginViewController, JSONModel, MessageToast) {
	"use strict";

	return PluginViewController.extend("abb.views.reprintTracableId.reprintTracableIdPlugin.reprintTracableIdPlugin.controller.MainView", {
		onInit: function () {
			PluginViewController.prototype.onInit.apply(this, arguments);
            oBundle = this.getView().getModel("i18n").getResourceBundle();
            oWebController=this;
		},

        onAfterRendering: function(){
            oWebController.getView().byId("backButton").setVisible(oWebController.getConfiguration().backButtonVisible);
            oWebController.getView().byId("closeButton").setVisible(oWebController.getConfiguration().closeButtonVisible);
            oWebController.getView().byId("headerTitle").setText(oWebController.getConfiguration().title);
        },

		onBeforeRenderingPlugin: function () {

		},

        oBindReprintTable(oEvent){
            const currentPlant = oWebController.getPodController().getUserPlant();
            const currentSfc = oEvent.getParameters().value;
            if(!currentSfc){
                MessageToast.show(oBundle.getText("error.sfcRequired.msg"));
                return;
            }
            var keyGetTraceIdCompData = oWebController.getConfiguration().keyGetTraceIdCompData;
            if(!keyGetTraceIdCompData){
                MessageToast.show(oBundle.getText("error.keyGetTraceIdCompDataRequired.msg"));
                return;
            }
            var assyDataTraceIdUrl = oWebController.getPublicApiRestDataSourceUri() 
            + "/pe/api/v1/process/processDefinitions/start?async=false&key="+keyGetTraceIdCompData;
			oWebController.ajaxPostRequest(
                assyDataTraceIdUrl,
                { IN_PLANT: currentPlant, IN_SFC: currentSfc},
                function (oAssyDataTraceIdResponse) {
                    if(oAssyDataTraceIdResponse?.OUT_PLANNED_COMP){
						console.log(oAssyDataTraceIdResponse?.OUT_PLANNED_COMP);
                        const convertedData = oAssyDataTraceIdResponse?.OUT_PLANNED_COMP;
                        const fiteredData = convertedData.filter(data=> data.traceableId != null );
                        if(fiteredData.length === 0){
                            MessageToast.show(oBundle.getText("error.noDataAvailable.msg"));
                            return;
                        }
                        const oModel = new JSONModel({ dataList: fiteredData });
                        oWebController.getView().setModel(oModel, "reprintTraceModel");
                        console.log(convertedData);
                    }
                },
                function (oError) {
                    if(oError.code === 'errProcessExecution'){
                        var sErrorMsg = oError.details[0].message;
                        MessageToast.show(oBundle.getText("error.traceableIdComp.msg",[sErrorMsg]));
					}else{
                        MessageToast.show(oBundle.getText("error.traceableIdComponent.msg"));
                    }
                    console.error("An error occurred while getting traceable Id component data:"+oError);
                }
            );
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