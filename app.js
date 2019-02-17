//import module
var restify = require('restify');
var builder = require('botbuilder');
var menuItems = require('./menuConfig.json')

//create web server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || "3978",function(){
    console.log('%s listening to %s', server.name, server.url);
})

//create connector
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
})

server.post('/api/messages',connector.listen());

var bot = new builder.UniversalBot(connector)

bot.dialog('/',[
    function(session){
        session.send('歡迎使用自動餐點飲料訂單機器人');
        session.replaceDialog('mainMenu');},
    ]);

bot.dialog('mainMenu',[
    function(session, args){
        var promptText;
        if(args && args.reprompt){
            promptText = "請問您要再點些什麼？"
        }
        else{
            var promptText = "請問您要點什麼？"
            session.conversationData.orders = new Array();
        }
        builder.Prompts.choice(session, promptText, menuItems, {listStyle:builder.ListStyle.button});
    },
    function(session,results){
        var key = results.response.entity;
        var dialogID = menuItems[key];
        if (key == "結帳"){
            session.replaceDialog(dialogID);
        }
        else{session.beginDialog(dialogID)}
        ;
    },
    
    function(session, results){
        var order = results.response;
        var msg;
        if (order.item == "drink"){
            msg = `${order.Favor}${order.Size}X${order.Number}杯`;
        }
        else if (order.item == "food"){
            msg = `${order.foodName}X${order.foodNumber}份`
        }
            session.send("您剛剛點了:<br>%s", msg);
            session.conversationData.orders.push(order);
            session.replaceDialog('mainMenu',{reprompt:true});
            }
    ,

    
])

bot.dialog('orderDrink',[
        function(session){
            session.dialogData.orders = {item: "drink"};
            builder.Prompts.choice(session,"請問今天喝什麼呢？",["紅茶","綠茶","奶茶"],{listStyle:builder.ListStyle.button})},
        function(session, results){
            session.dialogData.orders.Favor = results.response.entity;
            builder.Prompts.choice(session,"請問您要的飲料大小是？",["大杯","中杯","小杯"],{listStyle:builder.ListStyle.button});},
        function(session, results){
            session.dialogData.orders.Size = results.response.entity;
            builder.Prompts.number(session,"請問您要幾杯呢？");},
        function(session, results){
            session.dialogData.orders.Number = results.response;
            session.endDialogWithResult({
                response:session.dialogData.orders
            })}
        ]);

bot.dialog('orderFood',[
    
    function(session){
        session.dialogData.orders = {item: "food"};
        builder.Prompts.text(session,"請問要點什麼餐點？");
        },
    function(session, results){
        session.dialogData.orders.foodName = results.response;
        builder.Prompts.number(session,"請問要點幾份？");
    },
    function(session, results){
        session.dialogData.orders.foodNumber = results.response;
        session.endDialogWithResult({
            response: session.dialogData.orders});
    }
])

bot.dialog('checkOut', [
    function(session){
        session.beginDialog("shipment")
    },
    function(session, results){
        var shipments = session.dialogData.shipments = results.response;
        var shipmentsText = "訂購人資訊 : <br>" + shipments.Name + "<br>" + shipments.Phone + "<br>" + shipments.Address; 
        var orders = session.conversationData.orders;
        var ordersText = "";
        orders.forEach(order =>{
            if(order.item == "drink"){
                ordersText += `<br>${order.Favor}${order.Size}X${order.Number}杯`
            }
            else if(order.item == "food"){
                ordersText += `<br>${order.foodName}X${order.foodNumber}份`
            }
        })
        session.endConversation("%s<br>訂單明細:%s",shipmentsText, ordersText);
    },
])

bot.dialog('shipment',[
        function(session,results){
            session.dialogData.shipments = {};
            builder.Prompts.text(session,"請問您的大名是?")},
        function(session, results){
            session.dialogData.shipments.Name = results.response;
            builder.Prompts.text(session,"請問您的連絡電話是?")},
        function(session, results){
            session.dialogData.shipments.Phone = results.response;
            builder.Prompts.text(session,"請問您的地址是?")},
        function(session, results){
            session.dialogData.shipments.Address = results.response;
            session.endDialogWithResult({
                response:session.dialogData.shipments
            })}
        ]);
        