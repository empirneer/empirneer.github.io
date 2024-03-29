document.getElementById("gameplace").innerHTML = '<canvas id="myCanvas" onclick="firebullet()" onmousemove="mouseupdate(event)"></canvas>';

var c = document.getElementById("myCanvas");
var ctx=c.getContext("2d", {alpha: true});
c.width  = window.innerWidth;
c.height = window.innerHeight;
var keys = {};
window.onkeyup = function(e) { keys[e.keyCode] = false; }
window.onkeydown = function(e) { keys[e.keyCode] = true; }

var myid = Math.round(Math.random()*100000);
var myname = "bird" + myid;
var myhealth = 100;
var myactive = 0;
var myreq = 0;
var mysize = 40;
var xpos = Math.round(Math.random()*2000)-1000;
var ypos = Math.round(Math.random()*1000)-500;

var xmouse = 0;
var ymouse = 0;

var fps = 60;
var netime = new Date();

var playersname = [];
var playerssize = [];
var playersx = [];
var playersy = [];
var playersactive = [];
var playersdx = []; // display x
var playersdy = []; // display y
var playershealth = []; // display y
var playersrecent = []; // get most recent request number so that it cannot act off previous frames
        
        var mybulletsx = [];
        var mybulletsy = [];
        var mybulletsdir = [];
        
        var playersbulletsx = [];
        var playersbulletsy = [];
        var playersbulletsdir = [];
        var playersbulletsname = [];
        
        const pubnub = new PubNub({
            publishKey : "pub-c-b2010787-f12b-462f-86c3-63893939f846",
            subscribeKey : "sub-c-1a504e2e-949e-11e9-a293-62d4500be10d"
        }); 

pubnub.publish({
            message_id: myid,
            channel : "game", 
            message : "Hello",
            usecase: "update",
            deleted: false,
            is_update: true
        }, function(status, response) { 
            //Handle error here 
        });
        
        const button = document.getElementById('chat-publish');
        
        pubnub.subscribe({
            channels: ['game']
        }); 
        
        pubnub.publish({
            message_id: myid,
            channel : "game", 
            message : ['create',myname,xpos,ypos,myhealth,mysize],
            usecase: "update",
            deleted: false,
            is_update: true
        }, function(status, response) { 
            //Handle error here 
        });
        
        pubnub.addListener({
            message: function(event) {
                
                if (event.channel == 'game') {
                    
                    // if create
                    
                    if (event.message[0] == 'create' && event.message[1] != myname) {
                        // respond to create
                        pubnub.publish({
                            message_id: myid,
                            channel : "game", 
                            message : ["create_response",event.message[1],myname,xpos,ypos,myhealth,mysize],
                            usecase: "update",
                            deleted: false,
                            is_update: true
                        }, function(status, response) { 
                            //Handle error here 
                        });
                        
                        playersname.push(event.message[1]);
                        playersx.push(event.message[2]);
                        playersy.push(event.message[3]);
                        playersdx.push(event.message[2]); // display
                        playersdy.push(event.message[3]);
                        playersactive.push(myreq);
                        playershealth.push(event.message[4]);
                        playersrecent.push(0);
                        playerssize.push(event.message[5]);
                    }
                    
                    // if creating
                    
                    if (event.message[0] == 'create_response' && event.message[1] == myname) {
                        playersname.push(event.message[2]);
                        playersx.push(event.message[3]);
                        playersy.push(event.message[4]);
                        playersdx.push(event.message[3]); // display
                        playersdy.push(event.message[4]);
                        playersactive.push(myreq);
                        playershealth.push(event.message[5]);
                        playersrecent.push(0);
                        playerssize.push(event.message[6]);
                        
                    }
                    
                    // movement
                    if (event.message[0] == 'move' && event.message[1] != myname && playersname.includes(event.message[1])) {
                        try {
                            var indexr = playersname.indexOf(event.message[1]);
                            if (event.message[4] > playersrecent[indexr]) {
                                playersx[indexr] = event.message[2];
                                playersy[indexr] = event.message[3];
                                playerssize[indexr] = event.message[5];
                            }
                        } catch(err) {
                            // ghost player (still in setup)
                        }
                    }
                    
                    // active player
                    
                    if (event.message[0] == 'active' && event.message[1] != myname && playersname.includes(event.message[1])) {
                        try {
                            var indexr = playersname.indexOf(event.message[1]);
                            playersactive[indexr] = myreq;
                        } catch(err) {
                            // ghost player (still in setup)
                        }
                    }
                    if (event.message[0] == 'active' && event.message[1] == myname && playersname.includes(event.message[1])) {
                        myactive = myreq;
                    }
                    
                    // create bullet
                    
                    if (event.message[0] == 'bullet' && event.message[1] != myname) {
                        playersbulletsx.push(event.message[2]);
                        playersbulletsy.push(event.message[3]);
                        playersbulletsdir.push(event.message[4]);
                        playersbulletsname.push(event.message[1]);
                    }
                    
                    if (event.message[0] == 'death' && event.message[1] != myname && playersname.includes(event.message[1])) {
                        try {
                            var indexr = playersname.indexOf(event.message[1]);
                            playersx.splice(indexr,1);
                            playersy.splice(indexr,1);
                            playersdx.splice(indexr,1);
                            playersdy.splice(indexr,1);
                            playersactive.splice(indexr,1);
                            playersname.splice(indexr,1);
                            playershealth.splice(indexr,1);
                            playersrecent.splice(indexr,1);
                            playerssize.splice(indexr,1);
                        } catch(err) {}
                    }
                    
                }
            } 
        }); 
        
        function firebullet() {
            var dir_ = ((Math.atan((xmouse-xpos)/(ymouse-ypos)))/(2*Math.PI))*360;
            if ((ymouse-ypos) < 0) {dir_+=180}
            mybulletsx.push(xpos);
            mybulletsy.push(ypos);
            mybulletsdir.push(dir_);
            
            // send request
            pubnub.publish({
                message_id: myid,
                channel : "game", 
                message : ['bullet',myname,xpos,ypos,dir_],
                usecase: "update",
                deleted: false,
                is_update: true
            }, function(status, response) { 
                //Handle error here 
            });
        }
        
        function mouseupdate(event) {
            xmouse = ((event.clientX-c.width/2)/(c.width/2))*1000;
            ymouse = ((-(event.clientY-c.height/2))/(c.width/2))*1000;
        }
        
        function updatepos() {
            myreq += 1;
            pubnub.publish({
                message_id: myid,
                channel : "game", 
                message : ['move',myname,xpos,ypos,myreq,mysize],
                usecase: "update",
                deleted: false,
                is_update: true
            }, function(status, response) { 
                //Handle error here 
            });
            // send "active" report
            pubnub.publish({
                message_id: myid,
                channel : "game",
                message : ['active',myname, new Date()],
                usecase: "update",
                deleted: false,
                is_update: true
            }, function(status, response) { 
                //Handle error here 
            });
        }
        
        function gx(x_) {return (c.width/2)+(x_/1000*(c.width/2))}
        function gy(y_) {return (c.height/2)-(y_/1000*(c.width/2))}
        function gz(z_) {return (z_/1000*(c.width/2))}
        
        function controls() {
            if (keys["38"]) {ypos+=4} // Up
            if (keys["40"]) {ypos-=4} // Down
            if (keys["37"]) {xpos-=4} // Left
            if (keys["39"]) {xpos+=4} // Right
        }
        
        function drawbullets() {
            // draw self
            
            ctx.lineWidth = gz(3);
            ctx.strokeStyle = "blue";
            for (var i = 0; i<mybulletsx.length;i++) {
                ctx.beginPath();
                ctx.arc(gx(mybulletsx[i]), gy(mybulletsy[i]), gz(10), 0, 2 * Math.PI);
                ctx.closePath();
                ctx.stroke();
            }
            
            // draw others
            
            ctx.strokeStyle = "red";
            for (var i = 0; i<playersbulletsx.length;i++) {
                ctx.beginPath();
                ctx.arc(gx(playersbulletsx[i]), gy(playersbulletsy[i]), gz(10), 0, 2 * Math.PI);
                ctx.closePath();
                ctx.stroke();
            }
        }
        
        function drawplayers() {
            // draw strokes
            ctx.lineWidth = gz(6);
            
            ctx.strokeStyle = "red";
            for (var i = 0; i<playersname.length; i++) {
                ctx.beginPath();
                ctx.arc(gx(playersdx[i]), gy(playersdy[i]), gz(playerssize[i]), 0, 2 * Math.PI);
                ctx.closePath();
                ctx.stroke();
            }
            
            ctx.strokeStyle = "blue";
            ctx.beginPath();
            ctx.arc(gx(xpos), gy(ypos), gz(mysize), 0, 2 * Math.PI);
            ctx.closePath();
            ctx.stroke();
            
            // fill
            ctx.lineWidth = gz(2);
            
            ctx.fillStyle = "black";
            for (var i = 0; i<playersname.length; i++) {
                ctx.beginPath();
                ctx.arc(gx(playersdx[i]), gy(playersdy[i]), gz(playerssize[i]), 0, 2 * Math.PI);
                ctx.closePath();
                ctx.fill();
            }
            
            ctx.beginPath();
            ctx.arc(gx(xpos), gy(ypos), gz(mysize), 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
            
            // draw health
            ctx.lineWidth = gz(10);
            ctx.strokeStyle = "blue";
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(gx(xpos-40),gy(ypos+mysize+15));
            ctx.lineTo(gx(xpos+40),gy(ypos+mysize+15));
            ctx.stroke();
            ctx.lineWidth = gz(7);
            ctx.strokeStyle = "black";
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(gx(xpos-40),gy(ypos+mysize+15));
            ctx.lineTo(gx(xpos+40),gy(ypos+mysize+15));
            ctx.stroke();
            ctx.lineWidth = gz(4);
            ctx.strokeStyle = "blue";
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(gx(xpos-40),gy(ypos+mysize+15));
            ctx.lineTo(gx(xpos-40+((myhealth/100)*80)),gy(ypos+mysize+15));
            ctx.stroke();
        }
        
        function updatedisplay() {
            // movement smoothing
            for (var i = 0;i<playersx.length;i++) {
                
                if (Math.sqrt(((playersdx[i]-playersx[i])*(playersdx[i]-playersx[i])) + ((playersdy[i]-playersy[i])*(playersdy[i]-playersy[i]))) > 60) {
                    // back-glitching
                    playersdx[i] = Math.round(playersdx[i]+((playersx[i]-playersdx[i])/20));
                    playersdy[i] = Math.round(playersdy[i]+((playersy[i]-playersdy[i])/20));
                } 
                else {
                    playersdx[i] = Math.round(playersdx[i]+((playersx[i]-playersdx[i])/5));
                    playersdy[i] = Math.round(playersdy[i]+((playersy[i]-playersdy[i])/5));
                }
            }
        }
        
        function testplayeractive() {
            
            var thisdate = myreq;
            if (thisdate-myactive > 20) {
                // kick self
            }
            for (var i = 0;i<playersx.length;i++) {
                if (thisdate - playersactive[i] > 20) {
                    // delete
                    playersx.splice(i,1);
                    playersy.splice(i,1);
                    playersdx.splice(i,1);
                    playersdy.splice(i,1);
                    playersactive.splice(i,1);
                    playersname.splice(i,1);
                    playershealth.splice(i,1);
                    playersrecent.splice(i,1);
                    playerssize.splice(i,1);
                    i -= 1;
                }
            }
        }
        
        function updatebullets() {
            for (var i = 0; i<mybulletsx.length; i++) {
                mybulletsx[i] += (400*Math.sin((mybulletsdir[i]/360)*2*Math.PI))/fps;
                mybulletsy[i] += (400*Math.cos((mybulletsdir[i]/360)*2*Math.PI))/fps;
            }
            
            for (var i = 0; i<playersbulletsx.length; i++) {
                playersbulletsx[i] += (400*Math.sin((playersbulletsdir[i]/360)*2*Math.PI))/fps;
                playersbulletsy[i] += (400*Math.cos((playersbulletsdir[i]/360)*2*Math.PI))/fps;
                if (Math.sqrt((xpos-playersbulletsx[i])*(xpos-playersbulletsx[i]) + (ypos-playersbulletsy[i])*(ypos-playersbulletsy[i])) < 40) {
                    myhealth -= 3;
                }
            }
            
            if (myhealth < 1) {
                pubnub.publish({
                    message_id: myid,
                    channel : "game", 
                    message : ['death',myname],
                    usecase: "update",
                    deleted: false,
                    is_update: true
                }, function(status, response) { 
                    //Handle error here 
                });
            }
        }
        
        function step() {
            var oltime = new Date();
            
            fps = 1/((oltime-netime)/1000);
            
            try {
            c.width  = window.innerWidth;
            c.height = window.innerHeight;
            
            ctx.clearRect(0,0,c.width,c.height);
            ctx.fillStyle = "black";
            ctx.fillRect(0,0,c.width,c.height);
            controls();
            updatedisplay();
            updatebullets();
            drawbullets()
            drawplayers();
            testplayeractive()
            } catch(err) {alert(err)}
            
            netime = new Date();
            
            window.requestAnimationFrame(step);
        }
        
        window.setInterval(updatepos, 150);
        window.requestAnimationFrame(step);
