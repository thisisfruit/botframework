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
        session.send('歡迎使用自動飲料訂單機器人'),
        builder.Prompts.choice(session,"請問今天喝什麼呢？",["紅茶","綠茶","奶茶"],{listStyle:builder.ListStyle.button})},
    function(session, results){
        session.dialogData.Favor = results.response.entity;
        builder.Prompts.choice(session,"請問您要的飲料大小是？",["大杯","中杯","小杯"],{listStyle:builder.ListStyle.button});},
    function(session, results){
        session.dialogData.Size = results.response.entity;
        builder.Prompts.number(session,"請問您要幾杯呢？");},
    function(session, results){
        session.dialogData.Number = results.response;
        builder.Prompts.text(session,"請問您的大名是?")},
    function(session, results){
        session.dialogData.Name = results.response;
        builder.Prompts.text(session,"請問您的連絡電話是?")},
    function(session, results){
        session.dialogData.Phone = results.response;
        builder.Prompts.text(session,"請問您的地址是?")},
    function(session, results){
        session.dialogData.Address = results.response;
        session.endDialog(`您的訂購資料如下：<br>品項 : ${session.dialogData.Favor}<br>尺寸 : ${session.dialogData.Size}<br>數量 : ${session.dialogData.Number}<br>訂購人資訊 : <br>${session.dialogData.Name}<br>${session.dialogData.Phone}<br>${session.dialogData.Address}<br>`);},
    ]);

