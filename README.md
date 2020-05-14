# Run BloodVis through CHPC

To use this, make sure you are on a campus network (Any network should be fine as long as it is part of the campus). If off-campus, use a VPN that ends in utah.edu

## Start a remote desktop session

**The following are two options to log on to the CHPC. Either works fine.**

-Run through a browser session (Easier)
1. Go to https://redwood1.chpc.utah.edu:3443/
2. Log in with your uID and password. You also need to do the Duo authentication.
3. Launch session using MATE desktop

-Run through FastX (Recommended)
 1. Install [FastX](https://www.starnet.com/fastx/current-client?version=2.4.5)
 2. Open FastX, there should be a **+** button, click and add with SSH option.
 3. Enter the following information:
 
|  |  |
|--|--|
| Name |redwood.chpc.utah.edu  |
| host |redwood.chpc.utah.edu  |
| port |22  |
| user|Your UID|
4. Enter uID password and Duo authentication in the second password when prompted.
5. Click **+** to start a session with MATE desktop.

**The remaining steps are the same for either methods**

## Start the server

1. Launch a terminal.
2. Type `ssh bloodvis` to go to the VM. Enter uID password when prompted.
3. Type `cd /uufs/chpc.utah.edu/common/HIPAA/IRB_00124248/bloodvis/bloodvis/backend`
4. Type  `source /uufs/chpc.utah.edu/common/HIPAA/IRB_00124248/bloodvis/bin/activate`. if there is an error, try  `source /uufs/chpc.utah.edu/common/HIPAA/IRB_00124248/bloodvis/bin/activate.csh` instead. 
It should show as `(bloodvis)[uID@bloodvis]$`.
5. Type `pipenv run serve`

![Server image](https://github.com/visdesignlab/bloodvis/blob/master/images/server.png)


## Start the frontend

1. Launch a terminal.
2. Type `ssh bloodvis` to go to the VM. Enter uID password when prompted.
3. Type `cd /uufs/chpc.utah.edu/common/HIPAA/IRB_00124248/bloodvis/bloodvis/frontend`
4. Type `scl enable rh-nodejs10 bash`
5. Type `npm start`
    - _NOTE_: You may have to run `npm install` if `npm start` raises errors.
6. Close the firefox because that is a really old version and our tool does not work properly on there. 

## Start Chrome on VM

1. Launch a terminal
2. Type `ssh bloodvis -Y` to go to the VM. Enter uID password when prompted.
3. Type `google-chrome --use-gl=swiftshader` to view this in chrome.
4. Go to `localhost:3000` to view the visualization. 

