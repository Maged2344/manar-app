pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
    }

    triggers {
        pollSCM('* * * * *')
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/Maged2344/manar-app.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh '''
                    echo "$DOCKERHUB_CREDENTIALS_PSW" | docker login -u "$DOCKERHUB_CREDENTIALS_USR" --password-stdin
                    docker push magedmohamed/manar-app-web:latest
                    docker push magedmohamed/manar-app-backend:latest
                    docker logout
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    DEPLOY_DIR=/home/maged/manar-app

                    cd $DEPLOY_DIR

                    # Stop running containers
                    docker compose down || true

                    # Clean old files (keep volumes)
                    sudo rm -rf $DEPLOY_DIR/frontend $DEPLOY_DIR/backend $DEPLOY_DIR/nginx
                    sudo rm -f $DEPLOY_DIR/docker-compose.yml

                    cd $OLDPWD

                    # Copy fresh project structure
                    cp docker-compose.yml $DEPLOY_DIR/docker-compose.yml
                    cp -r backend $DEPLOY_DIR/backend
                    cp -r frontend $DEPLOY_DIR/frontend
                    cp -r nginx $DEPLOY_DIR/nginx

                    cd $DEPLOY_DIR
                    docker compose build --no-cache
                    docker compose up -d
                    docker image prune -f
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment successful! Site is live at https://manar.cloud-stacks.com'
        }
        failure {
            echo 'Deployment failed. Check the logs.'
        }
    }
}
