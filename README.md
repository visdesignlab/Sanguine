# Sanguine Visualization Project 

This project is a collaboration between VDL and ARUP at University of Utah. We visualize blood usage in cardiac surgeries and associated patient and surgery attributes. Through this interactive visualization tool, we hope to offer clinical practitioners a better overall view on the use of blood, thus facilitating better patient outcomes. 

![Interface image](https://github.com/visdesignlab/sanguine/blob/master/images/interface.png)

## Table of Contents

1. [Access Sanguine on CHPC](#access-sanguine-on-chpc)
1. [Quick start guide](#development-environment-quick-start)
    - [Start the server](#start-the-server)
    - [Start the frontend](#start-the-frontend)
1. [Deployment docs](#deploying-in-production)

## Access Sanguine on CHPC

To use this, make sure you are on the campus network. If off-campus, use a VPN that ends in utah.edu. Navigate to https://bloodvis.chpc.utah.edu

## Quick start guide


### Start the server

1. `cd` to the backend folder
1. Configure your .env file with the correct parameters based on the the .env.default
1. Configure the credentials you'll be using to connect to the database.
1. Run `pipenv install`
1. Run `pipenv run serve`

### Start the frontend

1. `cd` to the frontend folder
1. Configure your .env file with the correct parameters based on the the .env.default
1. Run `npm install`
1. Run `npm run start`


## Deployment docs

Link the systemd service files to the correct place for the user

```
# First time set up
systemctl --user enable $(pwd)/api.service
systemctl --user status api.service
systemctl --user start api.service

# Restart the api
systemctl --user restart api.service

# Start/restart the frontend
cd frontend
/usr/bin/scl enable rh-nodejs10 -- npm run build
sudo /usr/bin/rsync -av /uufs/chpc.utah.edu/common/HIPAA/IRB_00124248/deployed-app/bloodvis/frontend/build/* /var/www/html
sudo /usr/bin/chown -R apache. /var/www/html
sudo systemctl restart httpd24-httpd
```

