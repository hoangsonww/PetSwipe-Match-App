variable "vpc_id" {
  type        = string
  description = "VPC ID where Consul servers should run"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of Private Subnets for Consul servers"
}

variable "consul_cluster_size" {
  type        = number
  description = "Number of Consul server nodes"
  default     = 3
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for Consul servers"
  default     = "t3.medium"
}
