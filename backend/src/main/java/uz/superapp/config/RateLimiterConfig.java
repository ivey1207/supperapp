package uz.superapp.config;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.redisson.cas.RedissonBasedProxyManager;
import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.redisson.command.CommandAsyncExecutor;

@Configuration
public class RateLimiterConfig {

    @Bean
    public ProxyManager<String> proxyManager(RedissonClient redissonClient) {
        CommandAsyncExecutor commandExecutor = ((org.redisson.Redisson) redissonClient).getCommandExecutor();
        return RedissonBasedProxyManager.builderFor(commandExecutor).build();
    }
}
