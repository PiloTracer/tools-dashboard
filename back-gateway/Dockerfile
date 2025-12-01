FROM kong:3.4

COPY kong.yml /usr/local/kong/declarative/kong.yml
COPY rate-limits.conf /etc/kong/rate-limits.conf
COPY security-rules /etc/kong/security-rules

CMD ["kong", "docker-start"]
