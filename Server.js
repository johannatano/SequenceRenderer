var express    =       require("express");
var multer     =       require('multer');
var fs         =       require('fs');
var path       =       require("path");
var util       =       require('util');
var mime       =       require('mime');
var fsExtra    =       require('fs-extra');
var easyimg    =       require('easyimage');
var app        =       express();
var done       =       false;


app.use(multer({ dest: './tmp/',
  rename: function (fieldname, filename) {
     return filename;
   },
  onFileUploadStart: function (file) {
  },
  onFileUploadComplete: function (file) {
  }
}));


var sourceFolder = './tmp/',
    outputFolder = './public/assets/sequence/',
    numFramesPerFile = 100,
    uploadFolderName = '',
    uploadsLength = 0,
    count = 0,
    config = {numFramesPerFile : numFramesPerFile, numFrames: 0};

app.post('/api/photo',function(req,res){

  fsExtra.emptyDirSync(outputFolder  + 'lowres');
  fsExtra.emptyDirSync(outputFolder  + 'highres');
  fsExtra.emptyDirSync(outputFolder  + 'json');
  fsExtra.copySync(sourceFolder, outputFolder + 'highres');

  var files = fs.readdirSync(sourceFolder);
  resizeImagesSync(files, function(){
    putFiles(getFiles(outputFolder + 'lowres'), outputFolder + 'json');
    fsExtra.emptyDirSync(sourceFolder);
    res.end('Upload success');
    console.log('Upload success');
  });

});



function resizeImagesSync(files, callback){
  if(!files.length){
    callback();
    return;
  }
  var file = files.shift();
  var isJPG = path.extname(file) == '.jpg';
  if(isJPG){
    console.log('resize file: ', file);
    easyimg.resize({src:sourceFolder + file, dst:outputFolder + 'lowres/' + file, width: 512, height: 288}).then(function(){
      resizeImagesSync(files, callback);
    });
  }else{
    resizeImagesSync(files, callback);
  }
}

function getFiles(dir){
    var files = fs.readdirSync(dir);
    var keyFrameRate = 10;
    var numKeyFrames = Math.floor(files.length/keyFrameRate);
    var currFile = 1;
    var stack = [];
    var frames = [];
    var keyFrames = [];
    stack.push(frames);
    config.numFrames = 0;
    for(var i = 0; i < files.length; i++){
        if(path.extname(files[i]) !== '.jpg'){
            files.splice(i,1);
        }
    }

    for(i = 0; i < files.length; i++){
         config.numFrames++;
        if(i > numFramesPerFile*currFile){
            frames = [];
            stack.push(frames);
            currFile++;
        }

        // console.log(files[i]);
        frames.push({frame: i, file: files[i], data: base64Img(dir + '/' + files[i])});

    }
    config.numFiles = stack.length;
   return stack;
}


function putFiles(stack, dir){
    if(config.numFrames === 0){
      console.log('Warning: No images found!');
      return;
    }
    var id = 0;
    for(var i in stack){
        id = i.toString();
        fs.writeFile(dir + '/framesdata_' + id + '.json', JSON.stringify(stack[i]), function(i, err) {
            if(err) {
                console.log(err);
            } else {
                console.log('Completed file ' + dir + '/framesdata_' + i + '.json');
            }
        }.bind(this, id));
    }
    fs.writeFile(dir + '/config.json', JSON.stringify(config));
}

function base64Img(src) {
    var data = fs.readFileSync(src).toString('base64');
    return util.format('data:%s;base64,%s', mime.lookup(src), data);
}

//start with clearing tmp folder
fsExtra.emptyDirSync(sourceFolder);

var IP = process.argv[2];
if(!IP) IP = '0.0.0.0';
app.use(express.static('public'));
app.listen(3000, IP,function(){
    console.log("Server running at IP: " + IP + " on port 3000");
});
