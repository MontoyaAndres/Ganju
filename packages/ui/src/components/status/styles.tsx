import { css } from '@emotion/react';
import styled from '@emotion/styled';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';

export type StatusTone = 'pending' | 'completed' | 'failed';

export const StatusBadgeWrapper = styled.span<{ tone: StatusTone }>`
  ${({ theme, tone }) => css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${theme.fonts.xs};
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    width: fit-content;
    background-color: ${theme.colors.bastille}0A;
    color: ${tone === 'failed'
      ? theme.colors.red
      : tone === 'completed'
        ? theme.colors.fernGreen
        : theme.colors.saltBox};
  `}
`;

export const FailedIcon = styled(ErrorOutlined)`
  ${({ theme }) => css`
    font-size: 14px;
    color: ${theme.colors.red};
  `}
`;

export const CompletedIcon = styled(CheckCircleOutlined)`
  ${({ theme }) => css`
    font-size: 14px;
    color: ${theme.colors.fernGreen};
  `}
`;
