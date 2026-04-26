# CS1660: Group Final Project

## Project Overview
This project is basic full-stack RAG system web-application, allowing users to easily generate responses across saved, secure sessions. The web application is based on React JS, with a simple, chatbot interface. There users can create accounts, sign-on, and ask the chatbot specific questions. The RAG system works on a database of Aesop’s fables, allowing users to ask and generate responses based on 119 different fables. 

Completing this full project required the integration of 8 AWS services, along with configuring Github Actions, and the React application. This README includes a general overview, as well as links to further resources we created to detail the project.

### Write-up and Architecture
A detailed report on how we decided to implement the application, justifications on architecture, and conclusions, is available on the repository here.

Additionally, a diagram of the integration of all the AWS services is seen below, and also available on the repository here.





## Running the Application

### Running Remotely
Below is a link to access the website:
[https://cs1666-final-project.work.gd/](https://cs1666-final-project.work.gd/)

### Running Locally
If you would prefer to run locally, follow these steps to clone the repo:
```bash
git clone https://github.com/kiana-kazemi/cs1660-final-project.git
```

And now run locally:
```bash
cd cs1660-final-project
cd cs166-frontend
npm install
npm run dev
```

## Using the Interface
The following steps detail how you can now use the interface:

### Signing In
First you will be greeted by a sign-in page. Here, click "Sign-in."
<img width="1006" height="206" alt="Project_SignIn" src="https://github.com/user-attachments/assets/860ed721-52f7-44fa-b2db-5328d46c09eb" />

Then, you will be taken to the Cognito interface. If you have not previously created account, then select "Create an account."
If you have previously created an account, log-in with the associated credentials you created your account with.
<img width="438" height="308" alt="Project_SignUp" src="https://github.com/user-attachments/assets/4941e87b-79f3-4a59-8614-a25d9906dc0c" />

### Asking Questions
Now you can access the application.


If you would like to ask a question about Aesop's fables, simply enter a question into the chatbot. Here, the chatbot will reference the 119 fables within the database to answer your question.


### Referencing Previous Chats
To reference previous chats, simply



### Signing Out
Once you have completed your session, you can sign-out. To do so, simply select the "Sign out" option listed under your log-in username.
<img width="260" height="114" alt="Project_SignOut" src="https://github.com/user-attachments/assets/8d3cf154-751f-423f-a7cf-2c58f89af343" />



