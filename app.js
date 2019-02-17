//import module
var restify = require('restify');
var builder = require('botbuilder');

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
        session.send('歡迎使用自動飲料訂單機器人');
        session.beginDialog('orderDrink');},
    function(session, results){
        session.dialogData.orders = results.response;
        session.beginDialog('shipments');},
    function(session, results){
       var shipments = session.dialogData.shipments = results.response;
       var orders = session.dialogData.orders;
       session.endDialog(`您的訂購資料如下：<br>品項 : ${orders.Favor}<br>尺寸 : ${orders.Size}<br>數量 : ${orders.Number}<br>訂購人資訊 : <br>${shipments.Name}<br>${shipments.Phone}<br>${shipments.Address}<br>`);},
    ]);

bot.dialog('orderDrink',[
        function(session){
            session.dialogData.orders = {};
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

bot.dialog('shipments',[
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
        