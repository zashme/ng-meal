
const schedule      = require('node-schedule');
const nodemailer    = require('nodemailer');
const moment        = require('moment');
const _             = require('lodash');
const Orders        = require('../models/order');

function generateOrders(date) {
  Orders.find({'date': date}, (err, orders) => {
    if(err) {return res.status(400).send({error: err.message});}
    let total = {
      first: 0,
      second: 0,
      total: 0
    }
    let customFirst = {};
    let customSecond = {};
    _.each(orders, function(order) {
      total.total += order.total;
      total.first += order.first.value;
      if(order.first.value > 0 && order.first.option && order.first.option.length) {
        if (customFirst.hasOwnProperty(order.first.option)) {
          customFirst[order.first.option] += order.first.value;
        } else {
          customFirst[order.first.option] = order.first.value;
        }
      }
      total.second += order.second.value;
      if(order.second.value > 0 && order.second.option && order.second.option.length) {
        if (customSecond.hasOwnProperty(order.second.option)) {
          customSecond[order.second.option] += order.second.value;
        } else {
          customSecond[order.second.option] = order.second.value;
        }
      }
    });
    let plainText = '';

    if (total.first > 0) {
      plainText += total.first + ' первых \n';
      if (!_.isEmpty(customFirst)) {
        for(let prop in customFirst) {
          if(customFirst.hasOwnProperty(prop)) {
            plainText += ' - ' +  prop + ' ' + customFirst[prop] + ' \n';
          }
        }
      }
    }
    if (total.second > 0) {
      plainText += total.second + ' вторых \n';
      if (!_.isEmpty(customSecond)) {
        for(let prop in customSecond) {
          if(customSecond.hasOwnProperty(prop)) {
            plainText += ' - ' +  prop + ' ' + customSecond[prop] + ' \n';
          }
        }
      }
    }
    plainText += 'Итого: ' + total.total;
    console.log(plainText);
    sendLetter(plainText);
  });
}

function sendLetter(text) {
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_ACC,
      pass: process.env.MAIL_PASS
    }
  });

  var mailOptions = {
    from: '"FusionWorks Meal 🍔" <meal@fusionworks.md>',
    to: 'anasonov@fusionworks.md',
    subject: 'Заказы',
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
  });
}


module.exports = {
  setschedule: () => {
    let ruleEvening = new schedule.RecurrenceRule();
    ruleEvening.dayOfWeek = [0, new schedule.Range(1, 5)];
    ruleEvening.hour = 18;
    ruleEvening.minute = 1;
    let sendEvening = schedule.scheduleJob(ruleEvening, () =>{
      generateOrders(moment().startOf('day').toISOString());
    });

    let ruleMorning = new schedule.RecurrenceRule();
    ruleMorning.dayOfWeek = [0, new schedule.Range(1, 5)];
    ruleMorning.hour = 10;
    ruleMorning.minute = 1;
    let sendMorning = schedule.scheduleJob(ruleMorning, () =>{
      generateOrders(moment().startOf('day').toISOString());
    });
  }
}