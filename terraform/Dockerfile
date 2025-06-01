# -------------------------------------------
# Dockerfile for Terraform workspace with
# Vault, Consul, and Nomad modules
# -------------------------------------------

# 1. Base image with Terraform preinstalled
FROM hashicorp/terraform:1.5.6 as terraform-base

# 2. Install dependencies for AWS CLI, Consul, Vault, Nomad
USER root
RUN apk add --no-cache \
      curl \
      unzip \
      bash \
      python3 \
      py3-pip \
      groff \
      less

# 3. Install AWS CLI v2
RUN pip3 install --no-cache-dir awscli

# 4. Install Vault CLI (version 1.14.0)
RUN VAULT_VERSION="1.14.0" && \
    curl -fsSL "https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_linux_amd64.zip" -o /tmp/vault.zip && \
    unzip /tmp/vault.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/vault && \
    rm /tmp/vault.zip

# 5. Install Consul CLI (version 1.14.3)
RUN CONSUL_VERSION="1.14.3" && \
    curl -fsSL "https://releases.hashicorp.com/consul/${CONSUL_VERSION}/consul_${CONSUL_VERSION}_linux_amd64.zip" -o /tmp/consul.zip && \
    unzip /tmp/consul.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/consul && \
    rm /tmp/consul.zip

# 6. Install Nomad CLI (version 1.4.2)
RUN NOMAD_VERSION="1.4.2" && \
    curl -fsSL "https://releases.hashicorp.com/nomad/${NOMAD_VERSION}/nomad_${NOMAD_VERSION}_linux_amd64.zip" -o /tmp/nomad.zip && \
    unzip /tmp/nomad.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/nomad && \
    rm /tmp/nomad.zip

# 7. Create a working directory and copy Terraform configs
WORKDIR /terraform
COPY . /terraform

# 8. Ensure Terraform modules and plugins can be downloaded
ENV TF_IN_AUTOMATION=true \
    TF_PLUGIN_CACHE_DIR=/terraform/.terraform/plugin-cache \
    AWS_DEFAULT_REGION=us-east-1

# 9. Set entrypoint to /bin/bash by default
ENTRYPOINT ["/bin/bash"]
CMD ["-c", "terraform version && bash"]

# -------------------------------------------
# Usage:
#   Build:
#     docker build -t petswipe-terraform:latest .
#
#   Run:
#     docker run --rm -it \
#       -v ~/.aws:/root/.aws \
#       -v $(pwd)/terraform:/terraform \
#       petswipe-terraform:latest
#
#   Inside container, you can:
#     cd /terraform/consul && terraform init && terraform apply
#     cd /terraform/vault  && terraform init && terraform apply
#     cd /terraform/nomad  && terraform init && terraform apply
# -------------------------------------------
