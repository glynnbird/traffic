var couchroot = window.location.origin;
var docId1="2";
var docId2="2";
var docId3="3";
var docId4="4";
var stack = [ ];
var livesync = null;
var disco = false;

var remotename="remote";
var remote = new PouchDB(couchroot + "/"+remotename);
var lmydb = new PouchDB("mydb");
var rmydb = new PouchDB(couchroot+ "/mydb");

var curl = function(method, path, body) {
  html = "<strong>curl -X " + method + " '" + couchroot + path + "'";
  if (body && (method == "POST" || method == "PUT")) {
    html += " -d'" + JSON.stringify(body,false, "  ") + "'";
  }
  html += "</strong>";
  $('#curl').html(html);
}

var getSlash= function() {
  $('#response_error').html("null");
  $('#response_data').html("");
  curl("GET", "/"+remotename, null);
  remote.info().then(function(data) {
    $('#response_data').html(JSON.stringify(data,false,2));
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });
};

var getDoc = function(d) {
  $('#response_error').html("null");
  $('#response_data').html("");
  curl("GET", "/"+remotename+"/"+d, null);
  remote.get(d).then(function(data) {
    $('#response_data').html(JSON.stringify(data,false,2));
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });  
};

var postDoc = function() {
  $('#response_error').html("null");
  $('#response_data').html("");
  var doc = { a:1,b:2,c:Math.random()};
  var options = { };
  curl("POST", "/"+remotename, doc);
  
  remote.post(doc, options).then(function(data) {
    $('#response_data').html(JSON.stringify(data,false,2));
    stack.push(data.id);
    $("#getbutton").removeAttr('disabled');
    $("#deletebutton").removeAttr('disabled');
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });  
};

var deleteDoc = function(d) {
  $('#response_error').html("null");
  $('#response_data').html("");
  if (stack.length==0) {
    $("#getbutton").prop("disabled", true);
    $("#deletebutton").prop("disabled", true);
  }
  curl("GET", "/"+remotename+"/"+d, null);
  remote.get(d).then(function(data) {
    curl("DELETE", "/"+remotename+"/"+d+"?rev="+data._rev, null);
    $('#response_data').html(JSON.stringify(data,false,2));
    return remote.remove(data._id, data._rev);
  }).then(function(data) {
    $('#response_data').html(JSON.stringify(data,false,2));
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });  
};


var clearTest = function() {
  curl("DELETE", "/" + remotename);
  remote.destroy().then(function(data) {
    curl("PUT", "/" + remotename);
    return remote = new PouchDB(couchroot+ "/remote")
  }).then(function(data) {
    stack = [];
    $('#response_data').html("");
    $("#getbutton").prop("disabled", true);
    $("#deletebutton").prop("disabled", true);
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });
};

var randId = function(splice) {
  var i = Math.floor(Math.random()*stack.length);
  var retval = stack[i];
  if (splice) {
    stack.splice(i,1);
  }
  return retval;
};

var lGetSlash = function() {
  lmydb.info().then(function(data) {
    $('#localdb').html(data.doc_count);
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });
};

var lPostBulk = function() {
  var docs = [];
  for(var i = 0; i < 10 ; i++) {
    var doc = { a:1,b:2,c:Math.random()};
    docs.push(doc);    
  }
  var options = { };
  lmydb.bulkDocs(docs, options).then(function(data) {
    lGetSlash();
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });  
};

var rGetSlash = function() {
  rmydb.info().then(function(data) {
    $('#remotedb').html(data.doc_count);
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });
};

var rPostBulk = function() {
  var docs = [];
  for(var i = 0; i < 10 ; i++) {
    var doc = { a:1,b:2,c:Math.random()};
    docs.push(doc);    
  }
  var options = { };
  rmydb.bulkDocs(docs, options).then(function(data) {
    rGetSlash();
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });  
};

var lReplicate = function() {
  var c = 0;
  lmydb.replicate.to(rmydb)
    .on('complete', function (info) {
        // handle complete
      $('#localdb').html("Done ");
      lGetSlash();
      rGetSlash();
    })
    .on('error', function (err) {
      // handle error
      console.log(err);
    });
};

var rReplicate = function() {
  var c = 0;
  rmydb.replicate.to(lmydb)
    .on('complete', function (info) {
        // handle complete
      $('#remotedb').html("Done ");
      lGetSlash();
      rGetSlash();
    })
    .on('error', function (err) {
      // handle error
      console.log(err);
    });
};

var liveReplicate = function() {
  $('#livereplicatebtn').prop("disabled", true);
  $('#cancelreplicatebtn').removeAttr('disabled');
  livesync = PouchDB.sync(lmydb,rmydb,  { live: true, retry:true})
    .on('paused', function(info) {
      lGetSlash();
      rGetSlash();
    });
}

var cancelReplicate = function() {
  livesync.cancel();
  $('#cancelreplicatebtn').prop("disabled", true);
  $('#livereplicatebtn').removeAttr('disabled');
};

var lClear = function() {
  lmydb.destroy().then(function(data) {
    return lmydb = new PouchDB("mydb")
  }).then(function(data) {
    lGetSlash();
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });
};

var rClear = function() {
  rmydb.destroy().then(function(data) {
    return rmydb = new PouchDB(couchroot+ "/mydb")
  }).then(function(data) {
    rGetSlash();
  }).catch(function(err){
    $('#response_error').html(JSON.stringify(err,false,2));
  });
};

var dance = function() {
  var tasks = [];
  for(var i=0; i<25; i++) {
    (function() {
      tasks.push(function(callback) {
        var doc= { dance: true, x: Math.random() };
        curl("POST", "/"+remotename, doc);
        remote.post(doc, function(err, data) {
          $('#response_data').html(JSON.stringify(data,false,2));
          setTimeout(callback, 50);
        });
      });
    })();
  }  
  tasks.push(function(callback) {
    remote.info(callback);
  });
  async.series(tasks, function() {
    if(disco) {
      setTimeout("dance()",500);
    }
  });
}

var toggleDisco = function() {
  if(disco) {
    disco = false;
  } else {
    disco = true;
    dance();
  }
}
lClear();
rClear();