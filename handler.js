'use strict';
const pacientes = [
  {id: 1, nome: "Maria", dataNascimento: "1984-11-10"},
  {id: 2, nome: "Joao", dataNascimento: "1985-11-10"},
  {id: 3, nome: "Jose", dataNascimento: "1986-11-10"}
];

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const params = {
  TableName: "PACIENTES",
};


module.exports.listarPacientes = async (event) =>{
  try{
    const queryString = {
      limit: 5,
      ...event.queryStringParameters
    }

    const { limit, next} = queryString

    let localParams = {
      ...params,
      Limit: limit
    }

    if(next){
      localParams.ExclusiveStartKey = {
        paciente_id: next 
      }
    }

    let data = await dynamoDb.scan(localParams).promise();

    let nextToken = data.LastEvaluatedKey != undefined
      ? data.LastEvaluatedKey.paciente_id
      : null;

    const result = {
      items: data.Items,
      next_token: nextToken 
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  }catch(err){
    console.log("Error", err);
    return{
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknow error",  
      }),
    };

  }
};


/*module.exports.listarPacientes = async (event) => {
  try{
    let data = await dynamoDb.scan(params).promise();
    return{
      statusCode:200,
      body: JSON.stringify(data.Items)
    };
  } catch(err){
    console.log("Error", err);
    return{
      statusCode: err.statusCode ? err.statusCode : 500,
      body: JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknow error",  
      }),
    };

  }


};*/

module.exports.obterPaciente = async (event) => {
  try{
    const { pacienteId } = event.pathParameters
    const data = await dynamoDb
      .get({
        ...params,
        Key: {
          paciente_id: pacienteId
        }
      })
      .promise()

      if (!data.Item){
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Paciente nao encontrado' }, null, 2)
        }
      }
      const paciente = data.Item

      return{
        statusCode: 200,
        body: JSON.stringify(paciente, null, 2),
      };
  }catch (err){
    console.log("Error", err);
    return{
      statusCode : err.statusCode ? err.statusCode : 500,
      body:  JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error", 
      }),
    };
  }
};

module.exports.cadastrarPaciente = async (event) => {
  try{

    console.log(event) 
    const timestamp = new Date().getTime();
    let dados = JSON.parse(event.body);
    const {
      nome, data_nascimento, email, telefone
    } = dados;

    const paciente = {
      paciente_id : uuidv4(),
      nome,
      data_nascimento,
      email,
      telefone,
      status : true,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await dynamoDb
      .put({
        TableName: "PACIENTES",
        Item: paciente,
      })
      .promise();

      return{
        statusCode: 201,

      }
  }catch (err){
    console.log("Error", err);
    return{
      statusCode : err.statusCode ? err.statusCode : 500,
      body:  JSON.stringify({
        error: err.name ? err.name : "Exception",
        message: err.message ? err.message : "Unknown error", 
      }),
    };
  }
  
};

module.exports.atualizarPaciente = async (event) => {
  const { pacienteId } = event.pathParameters
  try{
    const timestamp = new Date().getTime();
    let dados = JSON.parse(event.body);
    const { nome, data_nascimento, email, telefone } = dados;

    await dynamoDb
      .update({
        ...params,
        Key:{
          paciente_id: pacienteId
        },
        UpdateExpression:
         'SET nome = :nome, data_nascimento = :dt, email = :email,'
         +' telefone = :telefone, atualizado_em = :atualizado_em', 
         ConditionExpression: 'attribute_exists(paciente_id)',
         ExpressionAttributeValues: {
           ':nome' : nome,
           ':dt' : data_nascimento,
           ':email' : email,
           ':telefone' : telefone,
           ':atualizado_em' : timestamp 
         }
      })
      .promise()
      return{
        statusCode: 204,

      };  
  }catch (err) {
    console.log("Error", err);
    let error = err.name ? err.name : "Exception";
    let message = err.message ? err.message : "Unknown error";
    let statusCode = err.statusCode ? err.statusCode : 500;

    if (error == "ConditionalCheckFailedException"){
      error = "Paciente nao existe";
      message = "Recurso com id ${paciente_id} nao existe e nao pode ser atualizado";
      statusCode = 404; 
    }

    return{
      statusCode,
      body:  JSON.stringify({
        error,
        message,
      }),
    };
    
  }
};

module.exports.excluirPaciente = async (event) => {
  const { pacienteId } = event.pathParameters
  try{
    await dynamoDb
      .delete({
        ...params,
        Key: {
          paciente_id: pacienteId
        },
        ConditionExpression: 'attribute_exists(paciente_id)'
      })
      .promise()
    return{
      statusCode: 204
    }  
  }catch(err){
    console.log("Error", err);

    let error = err.name ? err.name : "Exception";
    let message = err.message ? err.message : "Unknown error";
    let statusCode = err.statusCode ? err.statusCode : 500;

    if (error == "ConditionalCheckFailedException"){
      error = "Paciente nao existe";
      message = "Recurso com id ${paciente_id} nao existe e nao pode ser atualizado";
      statusCode = 404; 
    }

    return{
      statusCode,
      body:  JSON.stringify({
        error,
        message,
      }),
    };


  }
};
