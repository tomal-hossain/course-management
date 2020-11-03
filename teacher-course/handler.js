'use strict';

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');
require('dotenv/config');

const courseValidator = require('./helper/course-validators')
const responseHandler = require('./helper/http-response')

const tableName = process.env.TABLE_NAME

module.exports.createCourse = async event => {
    const {courseName, maxStudent, teacherRef} = JSON.parse(event.body)
    const courseModel = {
        courseName,
        maxStudent,
        teacherRef
    }
    const {error} = courseValidator.validateCourse(courseModel)
    if(error){
        return responseHandler.httpResponse(400, {
            message: error.details[0].message
        })
    }
    courseModel.id =  uuidv4()
    let courseObject = {
        TableName: tableName,
        Item: courseModel
    };

    try{
        await dynamodb.put(courseObject).promise();
        return responseHandler.httpResponse(200, courseModel)
    } catch(e){
        return responseHandler.httpResponse(500, {
            message: e.message
        })
    }
};

module.exports.getCourses = async event => {
    const query = {
        TableName: tableName
    }
    try{
        const result = await dynamodb.scan(query).promise();
        return responseHandler.httpResponse(200, result.Items)
    } catch(e){
        return responseHandler.httpResponse(500, {
            message: e.message
        })
    }
};

module.exports.getCourse = async event => {
    const id = event.pathParameters.id
    const query = {
        TableName: tableName,
        Key: {
            id: id
        }
    }
    try{
        const result = await dynamodb.get(query).promise();
        if(result.Item) {
            return responseHandler.httpResponse(200, result.Item)
        } else {
            return responseHandler.httpResponse(404, {
                message: 'Not found!'
            })
        }
        
    } catch(e){
        return responseHandler.httpResponse(500, {
            message: e.message
        })
    }
};

module.exports.updateCourse = async event => {
    const id = event.pathParameters.id

    const status = await isCourseExist(id);
    if(!status){
        return responseHandler.httpResponse(404, {
            message: 'Not found!'
        })
    }
    const {courseName, maxStudent, teacherRef} = JSON.parse(event.body)
    const courseModel = {
        courseName,
        maxStudent,
        teacherRef
    }
    const {error} = courseValidator.validateCourse(courseModel)
    if(error){
        return responseHandler.httpResponse(400, {
            message: error.details[0].message
        })
    }
    const updateQuery = {
        TableName: tableName,
        Key: {
            id: id
        },
        UpdateExpression: "set courseName = :n, maxStudent = :m, teacherRef = :r",
        ExpressionAttributeValues: {
            ":n": courseModel.courseName,
            ":m": courseModel.maxStudent,
            ":r": courseModel.teacherRef,
        },
        ReturnValues:"UPDATED_NEW"
    }
    try{
        await dynamodb.update(updateQuery).promise();
        return responseHandler.httpResponse(200, courseModel)   
    } catch(e){
        return responseHandler.httpResponse(500, {
            message: e.message
        })
    }
};


module.exports.deleteCourse = async event => {
    const id = event.pathParameters.id

    const status = await isCourseExist(id);
    if(!status){
        return responseHandler.httpResponse(404, {
            message: 'Not found!'
        })
    }
    const query = {
        TableName: tableName,
        Key: {
            id: id
        }
    }
    try{
        await dynamodb.delete(query).promise();
        return responseHandler.httpResponse(200, {
            message: 'Deleted!'
        })  
    } catch(e){
        return responseHandler.httpResponse(500, {
            message: e.message
        })
    }
};

async function isCourseExist(id) {
    const findQuery = {
        TableName: tableName,
        Key: {
            id: id
        }
    }
    try{
        const result = await dynamodb.get(findQuery).promise();
        if(result.Item) {
            return true
        }
        return false;
    }
    catch{
        return false
    }
}