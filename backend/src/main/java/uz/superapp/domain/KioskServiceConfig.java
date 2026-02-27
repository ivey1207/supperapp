package uz.superapp.domain;

public class KioskServiceConfig {
    private String serviceId;
    private String command;
    private String relayBits;
    private Integer motorFrequency;
    private String motorFlag;
    private Integer pump1Power;
    private Integer pump2Power;
    private Integer pump3Power;
    private Integer pump4Power;

    public String getServiceId() { return serviceId; }
    public void setServiceId(String serviceId) { this.serviceId = serviceId; }
    public String getCommand() { return command; }
    public void setCommand(String command) { this.command = command; }
    public String getRelayBits() { return relayBits; }
    public void setRelayBits(String relayBits) { this.relayBits = relayBits; }
    public Integer getMotorFrequency() { return motorFrequency; }
    public void setMotorFrequency(Integer motorFrequency) { this.motorFrequency = motorFrequency; }
    public String getMotorFlag() { return motorFlag; }
    public void setMotorFlag(String motorFlag) { this.motorFlag = motorFlag; }
    public Integer getPump1Power() { return pump1Power; }
    public void setPump1Power(Integer pump1Power) { this.pump1Power = pump1Power; }
    public Integer getPump2Power() { return pump2Power; }
    public void setPump2Power(Integer pump2Power) { this.pump2Power = pump2Power; }
    public Integer getPump3Power() { return pump3Power; }
    public void setPump3Power(Integer pump3Power) { this.pump3Power = pump3Power; }
    public Integer getPump4Power() { return pump4Power; }
    public void setPump4Power(Integer pump4Power) { this.pump4Power = pump4Power; }
}
