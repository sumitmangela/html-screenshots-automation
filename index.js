const config = require('./config.js');

const puppeteer = require("puppeteer");
const fs = require('node:fs');
const path = require('path');
const { Document, ImageRun, Packer, Paragraph, PageBreak, TextRun } = require('docx');
const sizeOf = require('image-size');
const sharp = require('sharp');


/* screenshot */

const RemoveExtension = (file) =>{
  return file.substring(0, file.lastIndexOf("."))
}

const GetURLName = (file) =>{
  return (new URL(file)).hostname.replace("www.", "");
}


const TakeScreenshots = async (page) =>{
  /* creating screenshot dir if not exists, if exist deleting prev screenshots */
  if (fs.existsSync(config.dist_screenshot_path)) {
    fs.rmSync(config.dist_screenshot_path, {recursive: true})
  }
  fs.mkdirSync(config.dist_screenshot_path);

  /* html file screenshots */
  const htmlFiles = fs.readdirSync(config.src_path).filter( ( elm ) => elm.match(/.*\.(html?)/ig)); 
  for (const file of htmlFiles) {
    try {
      await page.goto(`file:${path.join(__dirname, config.src_path, file)}`);
      await page.screenshot({ path: config.dist_screenshot_path + RemoveExtension(file) +'.png', fullPage: true });
    } catch (err) {
      throw err
    }
  }

  /* url screenshots from json file */
  const jsonFiles = fs.readdirSync(config.src_path).filter( ( elm ) => elm.match(/.*\.(json?)/ig)); 
  for (const file of jsonFiles) {
    const fileContent = fs.readFileSync(path.join(__dirname, config.src_path, file), "utf8");
    const jsonContent = JSON.parse(fileContent);

    const lists = Object.values(jsonContent)
    for (const list of lists) {
      if(Array.isArray(list)){
        for (const url of list) {
          try {
            await page.goto(url);
            await page.screenshot({ path: config.dist_screenshot_path + GetURLName(url) +'.png', fullPage: true });
          } catch (err) {
            throw err
          }
        }
      }
    }
  }
}

/* Doc */

const CreateDoc = async () =>{
  if (fs.existsSync(config.dist_screenshot_path)) {
    const filenames = fs.readdirSync(config.dist_screenshot_path).filter( ( elm ) => elm.match(/.*\.(png?)/ig)); 
    const docObject = {
      sections: [
          {
                properties: {
                  page: {
                      margin: {
                          top: config.doc_margin,
                          right: config.doc_margin,
                          bottom: config.doc_margin,
                          left: config.doc_margin,
                      },
                  },
              },
              children: [],
          },
      ],
    }
    for (const file of filenames) {
     const dimensions = await sizeOf(config.dist_screenshot_path+file)
     const aspectRatio = dimensions.width / dimensions.height;

     const width = config.doc_image_width;
     const height =  width / aspectRatio;

     const max_height = config.doc_image_max_height * (dimensions.width / width);
     
     docObject.sections[0].children.push(
      new Paragraph({
        children: [
          new TextRun({
              text: RemoveExtension(file),
              font: config.doc_font,
              size: config.doc_font_size
        })]
      }))

     if((dimensions.height <= max_height)){
      docObject.sections[0].children.push(
        new Paragraph({
            children: [
                new ImageRun({
                    data: fs.readFileSync(config.dist_screenshot_path+file),
                    transformation: {
                        width: width,
                        height: height
                    },
                }),
                new PageBreak()
            ],
        }))
     }
     else{
       /* Cropping image if too big */
       let remaining_height = dimensions.height;
       let crop_top = 0;
       let crop_height = max_height;
       for(let i=0; remaining_height > 0; i++){
        const originalImage = config.dist_screenshot_path+file;
        const outputImage = config.dist_screenshot_path+RemoveExtension(file)+'_'+i+'.png';
        const cropped_file = await sharp(originalImage).extract({ width: dimensions.width, height: parseInt(crop_height), left: 0, top: parseInt(crop_top) }).toFile(outputImage)
              .then(function(new_file_info) {  
                docObject.sections[0].children.push(
                  new Paragraph({
                      children: [
                          new ImageRun({
                              data: fs.readFileSync(outputImage),
                              transformation: {
                                  width: width,
                                  height: crop_height * (width/dimensions.width)
                              },
                          }),
                          new PageBreak()
                      ],
                  }))
              })
              .catch(function(err) { console.log("An error occured while cropping image");});

        remaining_height -= max_height;
        crop_height = remaining_height >= 0 && remaining_height < max_height ? remaining_height : max_height;
        crop_top = crop_top + max_height;
       }
     }

    }

    const doc = new Document(docObject)
    const date = new Date()
    if (!fs.existsSync(config.dist_screenshot_doc_path)) {
      fs.mkdirSync(config.dist_screenshot_doc_path);
    }
    Packer.toBuffer(doc).then((buffer) => {
      fs.writeFileSync(config.dist_screenshot_doc_path+'Screenshots_'+date.toISOString().slice(0, 10)+'.docx', buffer);
    });
  }
}

/* puppeteer */

const runApp = () =>{
  puppeteer
  .launch({
    defaultViewport: {
      width: config.screenshot_width,
      height: config.screenshot_min_height
    },
  })
  .then(async (browser) => {
    const page = await browser.newPage();
    await TakeScreenshots(page); //function to take screenshots
    if(config.enable_doc_creation){
      await CreateDoc();  //function to create doc file of all the screenshots
    }


    await browser.close();
  });
}

runApp();