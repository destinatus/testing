import os
import pulsar
import json
from elasticsearch import Elasticsearch

# Pulsar configuration
pulsar_service_url = os.getenv('PULSAR_SERVICE_URL')
pulsar_topic = os.getenv('PULSAR_TOPIC')
pulsar_subscription = os.getenv('PULSAR_SUBSCRIPTION')
ca_cert = os.getenv('CA_CERT')
client_cert = os.getenv('CLIENT_CERT')
client_key = os.getenv('CLIENT_KEY')

# Elasticsearch configuration
es_host = os.getenv('ELASTICSEARCH_HOST')
es_port = os.getenv('ELASTICSEARCH_PORT')
es_index = os.getenv('ELASTICSEARCH_INDEX')

# Initialize Pulsar client
client = pulsar.Client(pulsar_service_url,
                       tls_trust_certs_file_path=ca_cert,
                       tls_certificate_file_path=client_cert,
                       tls_private_key_file_path=client_key)

# Initialize Elasticsearch client
es = Elasticsearch([f'http://{es_host}:{es_port}'])

# Create a Pulsar consumer
consumer = client.subscribe(pulsar_topic, pulsar_subscription)

print(f"Connected to Pulsar topic: {pulsar_topic}")
print(f"Connected to Elasticsearch index: {es_index}")

while True:
    try:
        # Receive message from Pulsar
        msg = consumer.receive()
        print(f"Received message: {msg.data()}")
        
        # Parse the message data
        data = json.loads(msg.data())

        # Index the data in Elasticsearch
        result = es.index(index=es_index, body=data)
        print(f"Indexed document in Elasticsearch: {result['_id']}")

        # Acknowledge the message
        consumer.acknowledge(msg)

    except Exception as e:
        print(f"Error processing message: {e}")

# Clean up (this part will not be reached in the current setup)
client.close()
