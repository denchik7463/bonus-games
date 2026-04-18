FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=builder /app/target/random-service-1.0.0.jar app.jar

EXPOSE 9095

ENTRYPOINT ["java", "-jar", "app.jar"]