'use strict';

const parser = require('lambda-multipart-parser');
const xlsx = require('xlsx')
const courseValidator = require('./helper/course-validators')
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3()
const { v4: uuidv4 } = require('uuid');
require('dotenv/config');

const responseHandler = require('./helper/http-response')

const tableName = process.env.TABLE_NAME
const bucketName = process.env.BUCKET_NAME

module.exports.processFile = async event => {
    try{
        const result = await parser.parse(event);
        const courseFile = result.files[0];
        const workBook = xlsx.read(courseFile.content)
        const sheet_name_list = workBook.SheetNames;
        const response = xlsx.utils.sheet_to_json(workBook.Sheets[sheet_name_list[0]]);
        const courseObjects = [];
        for(let i=0; i<response.length; i++) {
            let {error} = courseValidator.validateCourse(response[i])
            if(error){
                return responseHandler.httpResponse(400, {
                    message: 'Data is not valid'
                })
            }
            response[i].id =  uuidv4()
            courseObjects.push({
                PutRequest: {
                    Item: response[i]
                }
            })
        }

        
        let courseParams = {
            RequestItems: {
                [tableName]: courseObjects
            }
        };
        await dynamodb.batchWrite(courseParams).promise();
        
        return responseHandler.httpResponse(200, {
            courses: response
        })
    }
    catch(e){
        console.log(`Error: ${e.message}`)
        return responseHandler.httpResponse(500, {
            message: 'Unable to parse this file'
        })
    }
}

module.exports.uploadVideo = async event => {
    try {
        const result = await parser.parse(event);
        const courseVideo = result.files[0];
        let videoContent = courseVideo.content;
        let videoContentType = courseVideo.contentType;
        let courseId = event.pathParameters.id;
        const uploadParams = {
            Body: videoContent,
            Key: courseId,
            ContentType: videoContentType,
            Bucket: bucketName
        }
        await s3.putObject(uploadParams).promise();
        return responseHandler.httpResponse(200, {
            message: 'Successfully uploadded!'
        });
    } catch (e) {
        return responseHandler.httpResponse(500, {
            message: 'Unable to upload video! PLease try again'
        });
    }
}

module.exports.deleteVideo = async event => {
    try {
        let courseId = event.pathParameters.id;
        const deleteParams = {
            Key: courseId,
            Bucket: bucketName
        }
        await s3.deleteObject(deleteParams).promise();
        return responseHandler.httpResponse(200, {
            message: 'Successfully deleted!'
        });
    } catch (e) {
        return responseHandler.httpResponse(500, {
            message: 'Unable to delete video! PLease try again'
        });
    }
}