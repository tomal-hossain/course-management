'use strict'

const Joi = require('joi');

const schema = Joi.object({
    courseName: Joi.string()
        .min(3)
        .max(30)
        .required(),

    maxStudent: Joi.number()
        .required(),

    teacherRef: Joi.string()
        .email()
        .required()
})


module.exports.validateCourse = (model) => {
    return schema.validate(model);
}