package uz.superapp.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtp(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Ваш код подтверждения - SuperApp");
        message.setText(
                "Здравствуйте!\n\nВаш код подтверждения: " + code + "\n\nПожалуйста, введите его в приложении.");
        mailSender.send(message);
    }
}
