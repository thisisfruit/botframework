//import module
var restify = require('restify');
var builder = require('botbuilder');
var menu = require('./menuConfig.json');
var botbuilder_azure = require("botbuilder-azure");
var mainMenu = menu.main;
var drinkMenu = menu.drink;
var foodMenu = menu.food;

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
var tableName = 'botdata';

var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, 
process.env['AzureWebJobsStorage']);

var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, 
azureTableClient);

var bot = new builder.UniversalBot(connector)
if(process.env.NodeEnv == "production"){

    bot.set('storage', tableStorage);

}
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
        builder.Prompts.choice(session, promptText, mainMenu, {listStyle:builder.ListStyle.button});
    },
    function(session,results){
        var key = results.response.entity;
        var dialogID = mainMenu[key];
        session.replaceDialog(dialogID);
        },
])

bot.dialog('drinkMenu',function(session){
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    var attachments = new Array();
    drinkMenu.forEach(drink => {
        var buttons = new Array();
        drink.specs.forEach(spec => {
            var postBackValue = {
                dialog: "addDrinkToCart",
                drink:{
                    "name": drink.name,
                    "size":spec.name,
                    "prices":spec.prices
                }
            }
            var button = builder.CardAction.postBack(session,JSON.stringify(postBackValue),`${spec.name} - $${spec.prices}`);
            buttons.push(button);
        });
        var heroCard = new builder.HeroCard(session)
            .title(drink.name)
            .images([
                builder.CardImage.create(session,drink.picture)
            ])
            .buttons(buttons)
        attachments.push(heroCard)
    });
    msg.attachments(attachments);
    msg.suggestedActions(builder.SuggestedActions.create(session,[builder.CardAction.imBack(session, "訂餐點","訂餐點"),builder.CardAction.imBack(session,"結帳","結帳")]));
    session.endDialog(msg);
}).triggerAction({matches:/^訂飲料$/})

bot.dialog('foodMenu',function(session){
    var msg = new builder.Message(session);
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    var attachments = new Array();
    foodMenu.forEach(food => {
        var postBackValue = {
            dialog: "addFoodToCart",
            food:{
                    "name": food.name,
                    "prices":food.prices
                }
            }
        var heroCard = new builder.HeroCard(session)
            .title(food.name)
            .subtitle(`$${food.prices}`)
            .images([
                builder.CardImage.create(session,food.picture)
            ])
            .buttons([
                new builder.CardAction.postBack(session,JSON.stringify(postBackValue),"購買")]);
        attachments.push(heroCard);
    });
    msg.attachments(attachments);
    msg.suggestedActions(builder.SuggestedActions.create(session,[builder.CardAction.imBack(session, "訂飲料","訂飲料"),builder.CardAction.imBack(session,"結帳","結帳")]));
    session.endDialog(msg);
}).triggerAction({matches:/^訂餐點$/})

bot.dialog('addDrinkToCart',[
    function(session){
        var drink = JSON.parse(session.message.text).drink;
        var order = session.dialogData.order = {
            item : "drink",
            drinkName:drink.name,
            drinkSize:drink.size,
            drinkPrices:drink.prices
        }
        builder.Prompts.number(session,`請問「${order.drinkName}」${order.drinkSize}要訂多少杯？`);
    },
    function(session,results){
        session.dialogData.order.drinkNumber = results.response;
        builder.Prompts.choice(session,"請問飲料冰熱？",["正常冰","少冰","微冰","去冰","溫飲","熱飲"],{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        session.dialogData.order.drinkHotOrIce = results.response.entity;
        builder.Prompts.choice(session,"請問飲料甜度？","全糖|少糖|半糖|微糖|無糖",{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        var order = session.dialogData.order;
        order.drinkSweetness = results.response.entity;
        var total = order.drinkPrices * order.drinkNumber;
        var orderDetail = `${order.drinkName} ${order.drinkHotOrIce} ${order.drinkSweetness}X${order.drinkNumber} ${order.drinkSize} 共$${total}元`;
        session.send("您剛才點了:\n\n%s", orderDetail);
        session.conversationData.orders.push(order);
        session.replaceDialog("mainMenu",{reprompt: true});
    },    
]).triggerAction({matches:/^{"dialog":"addDrinkToCart".*/});

bot.dialog('addFoodToCart',[
    function(session){
        var msg = session.message.text
        var food = JSON.parse(msg).food;
        var order = session.dialogData.order = {
            item : "food",
            foodName:food.name,
            foodPrices:food.prices
        }
        builder.Prompts.number(session,`請問「${order.foodName}」要訂幾份？`);
    },
    function(session,results){
        var order = session.dialogData.order;
        order.foodNumber = results.response;
        var total = order.foodPrices * order.foodNumber;
        var orderDetail = `${order.foodName} X${order.foodNumber}份 共$${total}元`;
        session.send("您剛才點了:\n\n%s", orderDetail);
        session.conversationData.orders.push(order);
        session.replaceDialog("mainMenu",{reprompt: true});
    },    
]).triggerAction({matches:/^{"dialog":"addFoodToCart".*/});

bot.dialog('checkOut', [
    function(session){
        if(session.conversationData.orders.length > 0){
            session.beginDialog("shipment");
        }else{
            session.send("購物車內沒有東西喔~");
            session.replaceDialog("mainMenu",{reprompt:false});
        }
    },
    function(session, results){
        var shipment = session.dialogData.shipments = results.response;
        var orders = session.conversationData.orders;
        var msg = new builder.Message(session);
        var items = [];
        var total = 0;
        orders.forEach(order =>{
            if(order.item == "drink"){
                var subtotal = order.drinkPrices * order.drinkNumber;
                var item = builder.ReceiptItem.create(session,`$${subtotal}`,`${order.drinkName}X${order.drinkNumber}${order.drinkSize}`)
                .subtitle(`${order.drinkHotOrIce}${order.drinkSweetness}`);
                items.push(item);
                total += subtotal;
            }
            else if(order.item == "food"){
                var subtotal = order.foodPrices * order.foodNumber;
                var item = builder.ReceiptItem.create(session,`$${subtotal}`,`${order.foodName}X${order.foodNumber}份`);
                items.push(item);
                total += subtotal;
            }
        });
        var attachment= new builder.ReceiptCard(session)
        .title("您的訂單明細")
        .facts([
            builder.Fact.create(session, shipment.Name, "訂購人"),
            builder.Fact.create(session, shipment.Phone, "連絡電話"),
            builder.Fact.create(session, shipment.Address, "配送地址"),
        ])
        .items(items)
        .total(`$${total}`);
        msg.addAttachment(attachment);
        session.endConversation(msg);
        session.replaceDialog("mainMenu",{reprompt:false});
    },
]).triggerAction({matches:/^結帳$/});

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
        