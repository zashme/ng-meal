const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const User     = require('../models/user')
const passport = require('passport');
const crypto   = require('crypto');
const nodemailer = require('nodemailer');

generateRandomToken = function(len) {
  return crypto.randomBytes(Math.ceil(len/2))
    .toString('hex') // convert to hexadecimal format
    .slice(0,len);   // return required number of characters
};

router.route('/register').post(function(req,res,next) {
  const mail = req.body.email;
  let isCorporateEmail = function(mail) {
    let mailParts = mail.split('@');
    return mailParts[1] == 'fusionworks.md';
  }

  if(!isCorporateEmail(mail)) {
    return res.status(400).send({message: 'Invalid email, use corporate Email'});
  }

  User.findOne({email: mail}, function(err, user) {
    if (user) {return res.status(400).send({message: 'User already registered'});}
    User.register(new User({
      username: mail.split('@')[0],
      email: mail,
      password: req.body.password,
    }), req.body.password, function(err, newUser){
      if (err) {return res.status(400).send({message: err.message});}
      return res.status(200).send({message: 'User was successfully registered'});
    });
  });
});

router.post('/login', passport.authenticate('local'), function(req, res) {
  User.findOne({'_id': req.user._id}, function(err, user) {
    if (err) {
      return res.status(400).send({message: err.message});
    }
    res.send(user);
  });
});

router.get('/logout', function(req, res) {
  req.logout();
  res.status(200).send({message: 'Logged out'});
});

router.post('/reset-password', function(req, res){
  User.findOne({ email: req.body.email}, function(err, user) {
    if (!user) { return res.status(404).send({message: 'User not found'}); }
    if(err) { return res.status(400).send({message: err.message}); }
    user.resetPasswordToken = generateRandomToken(20);
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    user.save(function(err) {
      if(err) { return res.status(400).send({message: err.message}); }

      let resetTokenLink = process.env.APP_URL + 'reset-password/?reset=' + user.resetPasswordToken;
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.MAIL_ACC,
          pass: process.env.MAIL_PASS
        }
      });

      let mailOptions = {
        from: '"FusionWorks Meal 🍔" <meal@fusionworks.md>',
        to: user.email,
        subject: 'Meal password reset',
        text: `Please folow this URL + ${resetTokenLink} to reset your password`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        res.status(200).send({message: `On your email: ${req.body.email} was send reset password instruction`});
        if (error) {return res.status(400).send({message: error}); }
      });

    });
  });
});

router.get('/is-auth', function(req, res){
  if (req.isAuthenticated()) {
    return res.status(200).send('isAuth');
  } else {
    return res.status(401).send('Unauthorized');
  }
});

module.exports = router;
