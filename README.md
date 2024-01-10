# HTML Screenshots Automation

Puppeteer based node js script that helps in automation of taking screenshots of either local HTML files or list of websites.

## Install dependencies

Run `npm install` to install all the dependencies.

## Commands

`npm run build` : Use this command to get screenshots of all the files provided in src folder. the screenshots will be stored in dist/screenshot. if enable_doc_creation flag is enabled then this command will also create a doc file containing all the screenshots in dist/screenshot-doc. 

## Config

All the configurations related to the script are stored in config.js file. all the configurations are self explanatory. 

the script will take screenshots of all the html files that are stored in src folder. It can also take screenshots of the websites if a json file is provided in src folder which has an array of all the websites URLs that we want to take screenshots of. example of both html and json files are given in src folder.


## Further help

puppeteer : https://www.npmjs.com/package/puppeteer \
docx : https://www.npmjs.com/package/docx

