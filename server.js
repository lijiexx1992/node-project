var express=require('express'); 
var async=require('async');
var bodyParser=require('body-parser');
var multer=require('multer');
var MongoClient=require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var fs=require('fs');
var url='mongodb://127.0.0.1:27017';
var app =express();
var path =require('path');

//上传文件需要临时储存一个目录
var upload=multer({dest:'/Users/lijie/Desktop/project/tmp'})

//引入暴露出来的arr
// var ignoreRouter=require('./config/ignoreRouter');


//获取响应信息,设置配置
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//设置响应头。来处理跨域问题
app.use(function(req,res,next){
    res.set({
        'Access-Control-Allow-Origin':'*'
    })
    next();
})


//自己实现中间件，用来判断登录
// app.use(function(req,res,next){
//     //需要排除登陆页面与注册页面,可以把一些不需要锁定的页面可以直接忽略，创建一个ignoreRouter.js文件
//     //排除登陆和注册 页面
//     if(ignoreRouter.indexOf(req.url) > -1){
//       next();
//       return;
//     }
//     //请求时获取cookie req.cookies，可以直接得到具体的值
//     var nickname = req.cookies.nickname;
//     //console.log(req.cookies.nickname)
//     if(nickname){
//       //如果存在就执行下一个页面
//       next();
//     }else{
//       //如果不存在就直接跳转回登录页面
//       res.redirect('http://127.0.0.1:8080/loging.html');
//     }
//     //中间件向下执行
//     //next();
//   })

//================================ 用户管理模块 ================================
//登陆请求
//localhost：3000/api/loging
app.post('/api/loging', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var results = {};
  
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      if (err) {
        results.code = -1;
        results.msg = '数据库连接失败';
        res.json(results);
        // 关闭数据库连接
        return;
      }
  
      var db = client.db('project');
      db.collection('user').find({
        username: username,
        password: password
      }).toArray(function(err, data) {
        if (err) {
          results.code = -1;
          results.msg = '查询失败';
        } else if (data.length <= 0) {
          results.code = -1;
          results.msg = '用户名或密码错误';
        } else {
          // 登录成功
          results.code = 0;
          results.msg = '登录成功';
          results.data = {
            nickname: data[0].nickname,
            isAdmin:data[0].isAdmin
          }
        }
        client.close();
        res.json(results);
      })
    })
  });

//注册请求
//localhost:3000/api/register
app.post('/api/register',function(req,res){
    var name=req.body.username;
    var pwd=req.body.password;
    var nickname=req.body.nickname;
    var age=parseInt(req.body.age);
    var sex=req.body.sex;
    var isAdmin=req.body.isAdmin==='是'?true:false;
    var results = {};
    //用户非空验证
   if (!name) {
    results.code = -1;
    results.msg = '账号不能为空';
    res.json(results);
    return;
  }
  if (!pwd) {
    results.code = -1;
    results.msg = '密码不能为空';
    res.json(results);
    return;
  }

  //连接数据库
  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    if (err) {
      results.code = -1;
      results.msg = '数据库连接失败';
      res.json(results);
      // 关闭数据库连接
      return;
    }

    var db = client.db('project');

    async.series([
      function(cb) {
        //找到度一样用户如果有就存在，如果没有就继续往下直接注册
        db.collection('user').find({username:name}).count(function(err, num) {
          if (err) {
            cb(err);
          }else if(num>0){
            cb('账户已存在');
          } 
          else {
            cb(null);
          }
        })
      },
      function(cb) {
        db.collection('user').insertOne({
            username:name,
            password:pwd,
            nickname:nickname,
            sex:sex,
            age:age,
            isAdmin:isAdmin
        },function(err){
            if(err){
                cb(err);
            }else{
                cb(null);
            }
        })
      }
    ],function(err, result) {
      if (err) {
        results.code = -1;
        results.msg = err;
      } else {
        results.code = 0;
        results.msg ='注册成功';
      }
      client.close();
      res.json(results);
    })
  })
})

//用户列表接口
//localhost:3000/api/users/list
app.get('/api/users/list', function(req, res) {
    var page = parseInt(req.query.page)||1;
    var pageSize = parseInt(req.query.pageSize)||4;
  
    var totalSize = 0;
    var totalPage = 0;
  
    var results = {};
  
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
      if (err) {
        results.code = -1;
        results.msg = '数据库连接失败';
        res.json(results);
        // 关闭数据库连接
        return;
      }
  
      var db = client.db('project');
  
      async.series([
        function(cb) {
          db.collection('user').find().count(function(err, num) {
            if (err) {
              cb(err);
            } else {
              totalSize = num;
              cb(null);
            }
          })
        },
        function(cb) {
          db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err, data) {
            if (err) {
              cb(err);
            } else {
              cb(null, data);
            }
          })
        }
      ],function(err, result) {
        if (err) {
          results.code = -1;
          results.msg = err.message;
        } else {
          totalPage = Math.ceil(totalSize / pageSize);

          results.code = 0;
          results.msg = '查询成功';
          results.data = {
            list: result[1],
            totalSize:totalSize,
            totalPage: totalPage,
            page: page,
            pageSize:pageSize
          }
        }
  
        client.close();
        res.json(results);
      })
    })
  });
  
//删除用户信息
//localhost:3000/api/users/delete
app.get('/api/users/delete',function(req,res){
  var id=req.query.id;
  var results={};
  //连接数据库
  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if(err){
      results.code = -1;
      results.msg = '连接失败';
      res.json(results);
      return;
    }
    var db=client.db('project');
    db.collection('user').deleteOne({
      _id:ObjectId(id)
    },function(err){
      if(err){
        results.code = -1;
        results.msg = '删除失败';
      }else{
        results.code = 0;
        results.msg ='删除成功';
      }
      client.close();
      res.json(results);
    })
  })
})

//查询用户信息
//localhost:3000/api/users/queryid
app.get('/api/users/queryid',function(req,res){
  var id=req.query.id;
  var results={};
  //console.log(id);

  //连接数据库
  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if (err) {
      results.code = -1;
      results.msg = '数据库连接失败';
      res.json(results);
      // 关闭数据库连接
      return;
    }

    var db = client.db('project');
  
    async.series([
      function(cb){
        db.collection('user').findOne({
          _id:ObjectId(id)
        },function(err,data){
          if(err){
            cb(err);
          }else{
            //console.log(data)
            cb(null,data);
          }
        })
      }
    ],function(err,result){
        if(err){
          results.code = -1;
          results.msg =err.message;
        }else{
          results.code = 0;
          results.mgs ='查询成功';
          results.data={
            list:result[0]
          }
        }
        client.close();
        res.json(results);
    })
  })
})

//修改用户信息
app.get('/api/users/change',function(req,res){
  var id=req.query.id;
  var pwd=req.query.password;
  var nickname=req.query.nickname;
  var age=parseInt(req.query.age);
  var sex=req.query.sex;
  var results={};
  //console.log(id,pwd,nickname,age);

  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if (err) {
      results.code = -1;
      results.msg = '数据库连接失败';
      res.json(results);
      // 关闭数据库连接
      return;
    }
    var db = client.db('project');
    var whereStr={
      "_id":ObjectId(id)
    };
    var updateStr={$set:
     { "password":pwd,
      "nickname":nickname,
      "age":age,
      "sex":sex }
    };

    db.collection('user').updateOne(whereStr,updateStr,function(err,data){
      if(err){
        results.code = -1;
        results.msg =err.message;
      }else{
        results.code = 0;
        results.msg ='修改成功';
      }
      client.close();
      res.json(results);
   })
  })
})


//获取搜索信息
app.get('/api/users/seacrh',function(req,res){
   var name=req.query.name;
   var filter= new  RegExp(name);  
  //console.log(name);
   //连接数据
   MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if (err) {
      res.json({
        code: -1,
        msg:'连接失败'
      })
      return;
    }
    var db = client.db('project');
    db.collection('user').find({
      nickname:filter
    }).toArray(function(err,data){
        if(err){
          res.json({
              code: -1,
              msg:'查询失败'
          })
        }else{
          res.json({
            code:0,
            msg:'查询成功',
            data: {
              list:data
            }
          })
        }
    })
    client.close();
   })
})


//================================ 品牌管理模块 ================================

//上传图片接口,并存入数据库
//localhost:3000/api/brand/upload
app.post('/api/brand/upload',upload.single('file'),function(req,res){
  //console.log(req.body.id)
  var results = {};
  var filieName='images/'+ new Date().getTime()+ '_' +req.file.originalname;
  var newFilieName=path.resolve(__dirname,'../nodeProject-fore/',filieName);
  try {
    fs.renameSync(req.file.path,newFilieName);

    //操作写入数据库
    MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
      var db = client.db('project');
      db.collection('brand').insertOne({
        brandName:req.body.barndName,
        filieName:filieName
      },function(err){
        if(err){
            results.code = -1;
            results.msg ='写入失败';
        }else{
            results.code =0 ;
            results.msg ='上传成功';
            return   res.redirect("http://127.0.0.1:8080/brand.html")
        }
        client.close();
        res.json(results);
      })
    })

  } catch (error) {
     res.json({
       code:-1,
       msg:'插入失败'
     });
  }
  
})

//品牌列表信息(能分页)
//localhost:3000/api/brand/list
app.get('/api/brand/list',function(req,res){
  var page = parseInt(req.query.page)||1;
  var pageSize = parseInt(req.query.pageSize)||4;

  var totalSize = 0;
  var totalPage = 0;

  var results = {};

  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if (err) {
      results.code = -1;
      results.msg = '数据库连接失败';
      res.json(results);
      // 关闭数据库连接
      return;
    }
    var db = client.db('project');

    async.series([
      function(cb) {
        db.collection('brand').find().count(function(err, num) {
          if (err) {
            cb(err);
          } else {
            totalSize = num;
            cb(null);
          }
        })
      },
      function(cb) {
        db.collection('brand').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err, data) {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        })
      }
    ],function(err, result) {
      if (err) {
        results.code = -1;
        results.msg = err.message;
      } else {
        totalPage = Math.ceil(totalSize / pageSize);

        results.code = 0;
        results.msg = '查询成功';
        results.data = {
          list: result[1],
          totalSize:totalSize,
          totalPage: totalPage,
          page: page,
          pageSize:pageSize
        }
      }

      client.close();
      res.json(results);
    })
  })
})

//删除品牌信息
//localhost:3000/api/brand/delete
app.get('/api/brand/delete',function(req,res){
  var id=req.query.id;
  var results={};
  //连接数据库
  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if(err){
      results.code = -1;
      results.msg = '连接失败';
      res.json(results);
      return;
    }
    var db=client.db('project');
    db.collection('brand').deleteOne({
      _id:ObjectId(id)
    },function(err){
      if(err){
        results.code = -1;
        results.msg = '删除失败';
      }else{
        results.code = 0;
        results.msg ='删除成功';
      }
      client.close();
      res.json(results);
    })
  })
})

//查询品牌信息
//localhost:3000/api/brand/queryid


//修改品牌信息
// localhost:3000/api/brand/change
app.post('/api/brand/change',upload.single('file'),function(req,res){
  var results = {};
  var brandName=req.body.brandName;
  var id=req.body._id;
  // console.log(req.body.barndName);//产品名称
  // console.log(req.body._id);//存储图片的id

  var filieName='images/'+ new Date().getTime()+ '_' +req.file.originalname;
  var newFilieName=path.resolve(__dirname,'../nodeProject-fore/',filieName);
  try {
    fs.renameSync(req.file.path,newFilieName);

    //操作写入数据库
    MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
      if (err) {
        results.code = -1;
        results.msg = '数据库连接失败';
        res.json(results);
        // 关闭数据库连接
        return;
      }
      var db = client.db('project');
      var whereStr={
        "_id":ObjectId(id)
      };
      var updateStr={
        $set:{
          "brandName":brandName,
          "filieName":filieName
        }
      }
      db.collection('brand').updateOne(whereStr, updateStr,function(err,data){
        if(err){
            results.code = -1;
            results.msg ='写入失败';
        }else{
            results.code =0 ;
            results.msg ='更新成功';
            return   res.redirect("http://127.0.0.1:8080/brand.html")
        }
        client.close();
        res.json(results);
      })
    })

  } catch (error) {
     res.json({
       code:-1,
       msg:'插入失败'
     });
  }

  
})


//================================ 手机管理模块 ================================


//新增手机信息
// localhost:3000/api/phone/upload
app.post('/api/phone/upload',upload.single('file'),function(req,res){
  console.log(req.body);

  var results = {};
  var filieName='images/'+ new Date().getTime()+ '_' +req.file.originalname;
  var newFilieName=path.resolve(__dirname,'../nodeProject-fore/',filieName);

  try {
    fs.renameSync(req.file.path,newFilieName);

    //操作写入数据库
    MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
      var db = client.db('project');
      db.collection('phone').insertOne({
        phoneName:req.body.phoneName,
        brandName:req.body.brandName,
        price:req.body.price,
        secondhandPrice:req.body.secondhandPrice,
        filieName:filieName
      },function(err){
        if(err){
            results.code = -1;
            results.msg ='写入失败';
        }else{
            results.code =0 ;
            results.msg ='上传成功';
            return   res.redirect("http://127.0.0.1:8080/phone.html")
        }
        client.close();
        res.json(results);
      })
    })

  } catch (error) {
     res.json({
       code:-1,
       msg:'插入失败'
     });
  }
  
})

//手机列表信息(能分页)
//localhost:3000/api/phone/list
app.get('/api/phone/list',function(req,res){
  var page = parseInt(req.query.page)||1;
  var pageSize = parseInt(req.query.pageSize)||4;

  var totalSize = 0;
  var totalPage = 0;

  var results = {};

  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if (err) {
      results.code = -1;
      results.msg = '数据库连接失败';
      res.json(results);
      // 关闭数据库连接
      return;
    }
    var db = client.db('project');

    async.series([
      function(cb) {
        db.collection('phone').find().count(function(err, num) {
          if (err) {
            cb(err);
          } else {
            totalSize = num;
            cb(null);
          }
        })
      },
      function(cb) {
        db.collection('phone').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function(err, data) {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        })
      }
    ],function(err, result) {
      if (err) {
        results.code = -1;
        results.msg = err.message;
      } else {
        totalPage = Math.ceil(totalSize / pageSize);

        results.code = 0;
        results.msg = '查询成功';
        results.data = {
          list: result[1],
          totalSize:totalSize,
          totalPage: totalPage,
          page: page,
          pageSize:pageSize
        }
      }

      client.close();
      res.json(results);
    })
  })
})

//删除手机信息
//localhost:3000/api/phone/delete
app.get('/api/phone/delete',function(req,res){
  var id=req.query.id;
  var results={};
  //连接数据库
  MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
    if(err){
      results.code = -1;
      results.msg = '连接失败';
      res.json(results);
      return;
    }
    var db=client.db('project');
    db.collection('phone').deleteOne({
      _id:ObjectId(id)
    },function(err){
      if(err){
        results.code = -1;
        results.msg = '删除失败';
      }else{
        results.code = 0;
        results.msg ='删除成功';
      }
      client.close();
      res.json(results);
    })
  })
})

//修改手机信息
//localhost:3000/api/phone/change
app.post('/api/phone/change',upload.single('file'),function(req,res){
  var results = {};
  var phoneName = req.body.phoneName;
  var brandName=req.body.brandName;
  var price=req.body.price;
  var secondhandPrice=req.body.secondhandPrice;
  var id=req.body._id;
  // console.log(req.body.brandName);//产品名称
  // console.log(req.body._id);//存储图片的id

  var filieName='images/'+ new Date().getTime()+ '_' +req.file.originalname;
  var newFilieName=path.resolve(__dirname,'../nodeProject-fore/',filieName);
  try {
    fs.renameSync(req.file.path,newFilieName);

    //操作写入数据库
    MongoClient.connect(url,{useNewUrlParser:true},function(err,client){
      if (err) {
        results.code = -1;
        results.msg = '数据库连接失败';
        res.json(results);
        // 关闭数据库连接
        return;
      }
      var db = client.db('project');
      var whereStr={
        "_id":ObjectId(id)
      };
      var updateStr={
        $set:{
          "phoneName":phoneName,
          "brandName":brandName,
          "price":price,
          "secondhandPrice":secondhandPrice,
          "filieName":filieName
        }
      }
      db.collection('phone').updateOne(whereStr, updateStr,function(err,data){
        if(err){
            results.code = -1;
            results.msg ='写入失败';
        }else{
            results.code =0 ;
            results.msg ='更新成功';
            return   res.redirect("http://127.0.0.1:8080/phone.html")
        }
        client.close();
        res.json(results);
      })
    })

  } catch (error) {
     res.json({
       code:-1,
       msg:'插入失败'
     });
  }

  
})

app.listen(3000);