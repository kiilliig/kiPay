const express = require('express')   // const:변수 선언, require:모듈 불러오기
var mysql = require('mysql');
var request = require('request');
var jwt = require('jsonwebtoken');
var auth = require('./lib/auth')

const app = express()

// *----font-end 구성----*//
app.set('views', __dirname + '/views');  // html위치 정의
app.set('view engine','ejs')  // html을 대체하는 ejs엔진 정의

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public')); // 정적파일 다루기, css,image파일 등

// *----mysql 연동----*//
var connection = mysql.createConnection({
 host     : 'localhost',
 user     : 'root',
 password : 'winner2411', // workbench에 입력한 개인 pw
 database : 'fintech',
 port : 3306
});

connection.connect();


// *-------------------------------------------------------------------*//
// *-----------------------------route get-----------------------------*//
// *-------------------------------------------------------------------*//

// *----signup page 렌더링----*//
app.get('/signup', function(req, res){
 res.render('signup')
})

// *----login page 렌더링----*//
app.get('/login', function(req, res){
 res.render('login');
})

// *----main page 렌더링----*//
app.get('/main', function(req, res){
 res.render('main');
})

// get method route example
app.get('/authResult', function(req, res){ // req : 클라이언트의 request에 대한 정보, res: 서버가 response할 정보
 var authCode = req.query.code; // get 방식으로 넘어오는 쿼리 스트링 파라미터를 담는다 code=123456677&asdf
 console.log(authCode);
   //사용자 토큰발급 api에 쓰였던 option 그대로 가져옴
 var option = {
   method : "POST",
   url : "https://testapi.openbanking.or.kr/oauth/2.0/token",
   headers : {
     'Content-Type' : "application/x-www-form-urlencoded; charset=UTF-8"
   },
   form : {
       code : authCode,
       client_id : '6NMFMxl1ChxEOAKVWAhuaOU7vTDSUhyziOoIVU43',
       client_secret : 'diLpT4pWHLjMbiMVdIlYG3l4JPnErXct4ua9yPw6',
       redirect_uri : 'http://localhost:3000/authResult',
       grant_type : 'authorization_code'
   }
 }
 request(option, function (error, response, body) {
   var parseData = JSON.parse(body); // json 문자열 구문 해석
   res.render('resultChild',{data : parseData}) // 서버가 resultChild.ejs를 렌더링 하여 보내줌
 });
})


// *-------------------------------------------------------------------*//
// *-----------------------------route post-----------------------------*//
// *-------------------------------------------------------------------*//

// *----signup page 구현----*//
app.post('/signup', function(req, res){
 var userName = req.body.userName
 var userEmail = req.body.userEmail
 var userPassword = req.body.userPassword
 var userAccessToken = req.body.userAccessToken
 var userRefreshToken = req.body.userRefreshToken
 var userSeqNo = req.body.userSeqNo
 console.log(userName,userPassword ,userAccessToken)
 console.log(req.body);

   // signup page에서 입력한 개인정보를 mysql db에 연결시킨다
 var sql = "INSERT INTO `fintech`.`user`(`user_email`,`user_password`, `accesstoken`,  `refreshtoken`, `userseqno`)"+
 " VALUES (?,?,?,?,?);"
 connection.query(sql, [userEmail, userPassword, userAccessToken, userRefreshToken, userSeqNo] , function (error, results, fields) {
   if (error) throw error;
   else {
     console.log(this.sql);
     res.json(1);
   }
 });
})

// *----login page 구현----*//
app.post('/login', function(req, res){
 var userEmail = req.body.userEmail;
 var userPassword = req.body.userPassword;
 var sql = "SELECT * FROM user WHERE user_email = ?"
 connection.query(sql, [userEmail], function(err, result){
   if(result.length == 0){
     //no member
   }
   else {
     if(userPassword == result[0].user_password){
       //jwt token
       var tokenKey = "f@i#n%tne#ckfhlafkd0102test!@#%"
       jwt.sign(
         {
             userId : result[0].id,
             userEmail : result[0].user_email
         },
         tokenKey,
         {
             expiresIn : '10d',
             issuer : 'fintech.admin',
             subject : 'user.login.info'
         },
         function(err, token){
             console.log('로그인 성공', token)
             res.json(token)
         }
       )

       console.log("is member!")
     }
   }
 })
})


// *----등록계좌조회 page 구현----*//
app.post('/list', auth, function(req, res){
   //#work6 requsest url https://testapi.openbanking.or.kr/v2.0/user/me?user_seq_no=1100034736
   var user = req.decoded;
   console.log(user);
   var sql = "SELECT * FROM user WHERE id = ?"
   connection.query(sql,[user.userId], function(err, result){
     console.log(result);
     var option = {
       method : "GET",
       url : "https://testapi.openbanking.or.kr/v2.0/user/me",
       headers : {
         'Authorization' : 'Bearer ' + result[0].accesstoken
       },
       qs : {
         user_seq_no : result[0].userseqno
       }
     }
     request(option, function (error, response, body) {
       var parseData = JSON.parse(body);
       res.json(parseData);
     });

   })
})

app.listen(3000)
