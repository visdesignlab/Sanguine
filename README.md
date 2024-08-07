# Sanguine Visualization Project 

This project is a collaboration between VDL and ARUP at the University of Utah. We visualize blood usage in cardiac surgeries and associated patient and surgery attributes. Through this interactive visualization tool, we hope to offer clinical practitioners a better overall view on the use of blood, thus facilitating better patient outcomes. 

![Interface image](https://vdl.sci.utah.edu/assets/images/publications/2021_ivi_sanguine/2021_ivi_sanguine_interface.png)


## Table of Contents

1. [Access Sanguine on CHPC at Utah](#access-sanguine-on-chpc-at-utah)
1. [Quick start guide](#quick-start-guide)
    - [Start the server](#start-the-server)
    - [Start the frontend](#start-the-frontend)
1. [Deployment docs](#deployment-docs)


## Access Sanguine on CHPC at Utah

To use this, make sure you are on the campus network. If off-campus, use a VPN that ends in utah.edu. Navigate to https://bloodvis.chpc.utah.edu.

We restrict who can access this application through Utah's CAS server, using duo two-factor authentication. If you need access to this application, please reach out to the developers.


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
1. Run `yarn install`
1. Run `yarn start`


## Deployment docs

Link the systemd service files to the correct place for the user

```
# First time set up
# systemctl enable $(pwd)/api.service
sudo systemctl status api.service
sudo systemctl start api.service

ln -s ../ANESTH_LOOKUP_040422.csv backend/api/ANESTH_LOOKUP_040422.csv
ln -s ../SURGEON_LOOKUP_040422.csv backend/api/SURGEON_LOOKUP_040422.csv
ln -s ../data_dictionary.csv backend/api/data_dictionary.csv
ln -s ../cpt_codes_cleaned.csv backend/api/cpt_codes_cleaned.csv

# Start/restart the frontend
cd frontend
/usr/bin/scl enable rh-nodejs10 -- yarn
/usr/bin/scl enable rh-nodejs10 -- yarn build
sudo /usr/bin/rsync -av /uufs/chpc.utah.edu/common/HIPAA/IRB_00124248/deployed-app/bloodvis/frontend/build/* /var/www/html
sudo /usr/bin/chown -R apache. /var/www/html
sudo systemctl restart httpd24-httpd

# Restart the api
sudo systemctl restart api.service
```

