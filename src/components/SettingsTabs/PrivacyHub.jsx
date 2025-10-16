import React from "react";
import {
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Slide,
  Box,
  Container,
  Grid,
  Paper,
  Divider,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  Link,
  Checkbox,
  Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import VideoLibraryOutlinedIcon from "@mui/icons-material/VideoLibraryOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ManageHistoryOutlinedIcon from "@mui/icons-material/ManageHistoryOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import AddIcon from "@mui/icons-material/Add";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import { useGlobalContext } from "../../contexts/GlobalContext";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const NavItem = ({ icon: Icon, label, onClick, active }) => (
  <Button
    onClick={onClick}
    startIcon={<Icon />}
    sx={{
      justifyContent: "flex-start",
      textTransform: "none",
      color: active ? "#1a73e8" : "#5f6368",
      backgroundColor: active ? "rgba(26,115,232,0.08)" : "transparent",
      borderRadius: "999px 0 0 999px",
      width: "100%",
      pl: 2,
      pr: 1,
      py: 1,
      '&:hover': { backgroundColor: active ? "rgba(26,115,232,0.12)" : "rgba(0,0,0,0.04)" }
    }}
  >
    <Typography sx={{ display: { xs: 'none', md: 'block' } }}>{label}</Typography>
  </Button>
);

const ListRowButton = ({ icon: Icon, title, subtitle, status, onClick }) => (
  <Button onClick={onClick} sx={{
    display: 'flex', alignItems: 'flex-start', textTransform: 'none', color: '#202124',
    width: '100%', justifyContent: 'space-between', py: 2
  }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
      <Icon sx={{ color: '#1a73e8', mt: 0.5 }} />
      <Box sx={{ ml: 2, textAlign: 'left' }}>
        <Typography sx={{ fontSize: '1rem' }}>{title}</Typography>
        {subtitle && <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>{subtitle}</Typography>}
        <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', mt: 0.5 }}>Manage settings</Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {status && <Typography sx={{ color: '#1a73e8', fontSize: '0.875rem', fontWeight: 600, mr: 1 }}>{status}</Typography>}
      <ChevronRightIcon sx={{ color: 'text.disabled' }} />
    </Box>
  </Button>
);

const Card = ({ children }) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
    {children}
  </Paper>
);

const SectionHeader = ({ title, action }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
    <Typography sx={{ fontSize: '1.25rem', color: '#202124' }}>{title}</Typography>
    {action}
  </Box>
);

const CenterColumn = ({ children }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
    <Box sx={{ width: '100%', maxWidth: 880 }}>{children}</Box>
  </Box>
);

const OutlinedPanel = ({ children, sx }) => (
  <Paper variant="outlined" square sx={{ p: 3, borderRadius: 1, ...sx }}>
    {children}
  </Paper>
);

// History settings card to match reference layout
const HistorySettingsRow = ({ label, status, onClick, icon }) => (
  <Button onClick={onClick} sx={{
    justifyContent: 'space-between', textTransform: 'none', color: '#202124', width: '100%',
    py: 1.5, px: 1.5
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Typography sx={{ fontSize: '0.95rem' }}>{label}</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>{status}</Typography>
      <ChevronRightIcon sx={{ color: 'text.disabled' }} />
    </Box>
  </Button>
);

const HistorySettingsCard = ({ onOpenWebActivity, onOpenTimeline }) => (
  <Card>
    <Box sx={{ p: 2.5 }}>
      <Typography sx={{ fontSize: '1rem', mb: 0.5 }}>History settings</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 2 }}>
        Choose whether to save the things you do and places you go to get more relevant results, personalized maps, recommendations, and more
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <HistorySettingsRow
          label="Web & App Activity"
          status="On"
          onClick={onOpenWebActivity}
          icon={<Box sx={{ width: 18, height: 18, borderRadius: '50%', background: '#1a73e8' }} />}
        />
        <Divider />
        <HistorySettingsRow
          label="Timeline"
          status="Paused"
          onClick={onOpenTimeline}
          icon={<MapOutlinedIcon sx={{ color: '#5f6368' }} />}
        />
        <Divider />
        <HistorySettingsRow
          label="StreamTube History"
          status="On"
          onClick={() => {}}
          icon={<VideoLibraryOutlinedIcon sx={{ color: '#5f6368' }} />}
        />
      </Paper>
    </Box>
  </Card>
);

export default function PrivacyHub({ open, onClose }) {
  const { privacySettings, setPrivacySettings } = useGlobalContext();
  const [activeView, setActiveView] = React.useState('dataAndPrivacy');

  const toggle = (key) => (e) => setPrivacySettings({ [key]: e.target.checked });

  const isSubPage = activeView === 'webAndAppActivity' || activeView === 'locationHistoryControls' || activeView === 'searchPersonalizationControls' || activeView === 'myAdCenter';

  return (
    <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition}>
      <AppBar elevation={0} sx={{ position: 'sticky', backgroundColor: '#fff', color: '#202124', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          {isSubPage && (
            <IconButton edge="start" color="inherit" onClick={() => setActiveView('dataAndPrivacy')} aria-label="back">
              <ChevronLeftIcon />
            </IconButton>
          )}
          <Typography sx={{ ml: isSubPage ? 0.5 : 1, flex: 1, fontSize: '1.125rem', fontWeight: 500, letterSpacing: 0.2 }}>
            MailG Account
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, backgroundColor: '#fff' }}>
        <Container maxWidth={false} sx={{ py: { xs: 2, md: 4 }, px: 0 }}>
          <Box sx={{ display: 'flex' }}>
            {/* Sidebar */}
            <Box sx={{ width: { xs: 0, md: 240 }, pr: { md: 2 }, pl: 0, display: { xs: 'none', md: isSubPage ? 'none' : 'block' }, ml: 0 }}>
              <NavItem icon={PersonOutlineOutlinedIcon} label="Personal info" active={activeView==='personalInfo'} onClick={() => setActiveView('personalInfo')} />
              <NavItem icon={ShieldOutlinedIcon} label="Data & privacy" active={activeView==='dataAndPrivacy'} onClick={() => setActiveView('dataAndPrivacy')} />
              <NavItem icon={SettingsOutlinedIcon} label="Security" active={activeView==='security'} onClick={() => setActiveView('security')} />
              <NavItem icon={StorageOutlinedIcon} label="Storage" active={activeView==='storage'} onClick={() => setActiveView('storage')} />
              <NavItem icon={ManageSearchOutlinedIcon} label="Preferences" active={activeView==='preferences'} onClick={() => setActiveView('preferences')} />
            </Box>

            {/* Main */}
            <Box sx={{ flex: 1 }}>
              {activeView === 'dataAndPrivacy' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Data & privacy</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Key privacy options to help you choose the data saved in your account, the ads you see, info you share with others, and more</Typography>
                      </Box>

                      <SectionHeader title="Privacy suggestions available" />
                      <Card>
                        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Take the Privacy Checkup and choose the settings that are right for you</Typography>
                            <Button sx={{ textTransform: 'none', color: '#1a73e8', px: 0 }}>Review suggestion (1)</Button>
                          </Box>
                          <ShieldOutlinedIcon sx={{ color: '#1a73e8' }} />
                        </Box>
                      </Card>

                      {/* Your data & privacy options with blue arrows */}
                      <Box sx={{ mt: 4 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Your data & privacy options</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            Things you’ve done and places you’ve been
                          </Button>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            Info you can share with others
                          </Button>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            Data from apps and services you use
                          </Button>
                          <Button sx={{ justifyContent: 'flex-start', textTransform: 'none', color: '#202124' }} startIcon={<KeyboardArrowDownOutlinedIcon sx={{ color: '#1a73e8' }} />}>
                            More options
                          </Button>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 6 }}>
                        <HistorySettingsCard
                          onOpenWebActivity={() => setActiveView('webAndAppActivity')}
                          onOpenTimeline={() => setActiveView('locationHistoryControls')}
                        />
                      </Box>

                      {/* See and delete your history anytime */}
                      <Box sx={{ mt: 3 }}>
                        <Typography sx={{ fontSize: '0.95rem', color: 'text.secondary', fontWeight: 500, mb: 1.5 }}>
                          See and delete your history anytime
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
                          <Chip icon={<ManageHistoryOutlinedIcon sx={{ color: '#1a73e8 !important' }} />} label="My Activity" variant="outlined" sx={{
                            borderRadius: 99,
                            borderColor: 'rgba(100,121,143,0.28)',
                            color: '#1a73e8'
                          }} />
                          <Chip icon={<MapOutlinedIcon sx={{ color: '#1a73e8 !important' }} />} label="NavMapper Timeline" variant="outlined" sx={{
                            borderRadius: 99,
                            borderColor: 'rgba(100,121,143,0.28)',
                            color: '#1a73e8'
                          }} />
                          <Chip icon={<PlayCircleOutlineIcon sx={{ color: '#d93025 !important' }} />} label="StreamTube watch & search history" variant="outlined" sx={{
                            borderRadius: 99,
                            borderColor: 'rgba(100,121,143,0.28)',
                            color: '#5f6368'
                          }} />
                        </Box>
                      </Box>

                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Ads and Personalization</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Card>
                              <Box sx={{ p: 2 }}>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Personalized ads</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>
                                  You can choose whether the ads you see on MailG services and partner sites are personalized
                                </Typography>
                              </Box>
                              <Divider />
                              <Button onClick={() => setActiveView('myAdCenter')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#fde68a', mr: 1, position: 'relative' }} />
                                  <Typography>My Ad Center</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <CheckCircleOutlineIcon sx={{ color: '#1a73e8', mr: 1 }} />
                                  <Typography sx={{ color: '#202124' }}>{privacySettings.adsPersonalizationEnabled ? 'On' : 'Off'}</Typography>
                                  <ChevronRightIcon sx={{ color: 'text.disabled', ml: 1 }} />
                                </Box>
                              </Button>
                              <Divider />
                              <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <SettingsOutlinedIcon sx={{ color: '#d93025', mr: 1, opacity: 0.8 }} />
                                  <Typography>Partner ads settings</Typography>
                                </Box>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                              </Button>
                              <Divider />
                              <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                <ShieldOutlinedIcon sx={{ color: '#1a73e8', mt: 0.25 }} />
                                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                  We protect your privacy. Content from CloudVault, MailG, and other services is never used for any ads purposes.
                                </Typography>
                              </Box>
                            </Card>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Card>
                              <Box sx={{ p: 2, flex: 1 }}>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Search personalization</Typography>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>Choose whether Search can show you personalized experiences based on data saved in your MailG account</Typography>
                              </Box>
                              <Divider />
                              <Button onClick={() => setActiveView('searchPersonalizationControls')} sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <CheckCircleOutlineIcon sx={{ color: '#1a73e8', mr: 1 }} />
                                  <Typography>{privacySettings.personalizationEnabled ? 'On' : 'Off'}</Typography>
                                </Box>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                              </Button>
                            </Card>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Info you can share with others */}
                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Info you can share with others</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', maxWidth: 500 }}>
                            Personal info you've saved in your account, like your birthday or email address, and options to manage it. This info is private to you, but you can make some of it visible to others on MailG services.
                          </Typography>
                          <Box sx={{ width: 80, height: 50, backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ml: 2 }}>
                            <GroupsOutlinedIcon sx={{ color: '#4caf50' }} />
                          </Box>
                        </Box>
                        <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <PersonOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
                              <Typography>Profile</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>Your info and who can see it</Typography>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <MapOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
                              <Typography>Location Sharing</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>Not sharing with anyone</Typography>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Button>
                        </Paper>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 500, mb: 1 }}>Other relevant options</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          <Chip label="Payment methods" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                          <Chip label="Subscriptions" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                          <Chip label="Your devices" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                          <Chip label="Contacts" variant="outlined" sx={{ borderRadius: 999, borderColor: 'rgba(100,121,143,0.28)' }} />
                        </Box>
                      </Box>

                      {/* Data from apps and services you use */}
                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Data from apps and services you use</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 3, maxWidth: 600 }}>
                          Your content and preferences related to the MailG services you use and third-party apps and services
                        </Typography>
                        <Paper sx={{ overflow: 'hidden' }}>
                          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500, mb: 1 }}>Content saved from MailG services</Typography>
                            <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 1, px: 1, width: '100%', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip icon={<MailOutlineIcon sx={{ color: '#d93025 !important' }} />} label="MailG" variant="outlined" size="small" sx={{ borderRadius: 999 }} />
                                <Chip icon={<StorageOutlinedIcon sx={{ color: '#1a73e8 !important' }} />} label="CloudVault" variant="outlined" size="small" sx={{ borderRadius: 999 }} />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>A summary of your services and data</Typography>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                              </Box>
                            </Button>
                          </Box>
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <CloudOutlinedIcon sx={{ color: 'text.secondary', mr: 2 }} />
                              <Typography>Third-party apps & services</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>No apps connected</Typography>
                              <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </Box>
                          </Button>
                        </Paper>
                      </Box>

                      {/* More options */}
                      <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 2 }}>More options</Typography>
                        <Paper sx={{ overflow: 'hidden' }}>
                          <Box sx={{ p: 2, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <DeleteOutlineIcon sx={{ color: '#dc2626', mr: 2 }} />
                              <Box>
                                <Typography sx={{ fontWeight: 500, color: '#b91c1c' }}>Delete your MailG Account</Typography>
                                <Typography sx={{ fontSize: '0.875rem', color: '#dc2626' }}>Permanently delete your entire account and data.</Typography>
                              </Box>
                            </Box>
                            <ChevronRightIcon sx={{ color: '#dc2626' }} />
                          </Box>
                        </Paper>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'webAndAppActivity' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Activity controls</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose which settings will save data in your MailG Account.</Typography>
                      </Box>

                      <OutlinedPanel sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <CheckCircleOutlineIcon sx={{ color: '#1a73e8' }} />
                          <Box>
                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500 }}>Safer with MailG</Typography>
                            <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              You control what data gets saved to your account.
                              <Link href="#" underline="hover"> Learn more</Link>
                            </Typography>
                          </Box>
                        </Box>
                      </OutlinedPanel>

                      <OutlinedPanel>
                        {/* Illustration */}
                        <Box sx={{ textAlign: 'center', mb: 2 }}>
                          <Box component="svg" viewBox="0 0 100 50" sx={{ width: 240, height: 'auto' }}>
                            <rect x="15" y="5" width="30" height="20" rx="2" stroke="#D1D5DB" strokeWidth="1.5" fill="#fff" />
                            <rect x="55" y="10" width="35" height="25" rx="2" stroke="#D1D5DB" strokeWidth="1.5" fill="#fff" />
                            <circle cx="30" cy="15" r="3" fill="#1a73e8" />
                            <rect x="60" y="15" width="25" height="2" fill="#1a73e8" />
                            <path d="M 22 21 L 38 21 L 38 23 L 22 23 Z" fill="#60A5FA" />
                            <text x="70" y="45" fontSize="6" fill="#9CA3AF" textAnchor="middle">Web, Mobile, Tablet</text>
                          </Box>
                        </Box>

                        <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Web & App Activity</Typography>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                          Saves your activity on MailG sites and apps, including associated info like location.
                          <Link href="#" underline="hover"> Learn more about Web & App Activity</Link>
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CheckCircleOutlineIcon sx={{ color: '#34a853' }} />
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>On</Typography>
                            <FormGroup>
                              <FormControlLabel control={<Switch checked={!!privacySettings.personalizationEnabled} onChange={toggle('personalizationEnabled')} />} label="Turn off" />
                            </FormGroup>
                          </Box>
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', ml: 5, mt: 1 }}>
                          On since you created your account
                        </Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>See and delete activity</Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                          <Button variant="outlined" size="small" startIcon={<MapOutlinedIcon />} sx={{ textTransform: 'none', borderRadius: 999 }}>NavMapper</Button>
                          <Button variant="outlined" size="small" startIcon={<AddIcon />} sx={{ textTransform: 'none', borderRadius: 999 }}>View all</Button>
                        </Box>

                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>Subsettings</Typography>
                        <FormGroup>
                          <FormControlLabel control={<Checkbox defaultChecked />} label="Include web history and activity from sites, apps, and devices that use MailG services" />
                          <FormControlLabel control={<Checkbox />} label="Include voice and audio activity" />
                          <FormControlLabel control={<Checkbox />} label="Include Visual Search History" />
                        </FormGroup>

                        <Typography sx={{ fontSize: '0.95rem', mt: 3, mb: 1 }}>Auto-delete (18m)</Typography>
                        <Button sx={{ justifyContent: 'space-between', textTransform: 'none', width: '100%' }}>
                          <Typography>Deleting activity older than 18 months</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Button>

                        <Button sx={{ textTransform: 'none', color: '#1a73e8', mt: 1, px: 0 }} endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 18 }} />}>
                          Manage all Web & App Activity
                        </Button>
                      </OutlinedPanel>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }} startIcon={<AddIcon sx={{ transform: 'rotate(45deg)' }} />}>
                          See all activity controls
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'locationHistoryControls' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Activity controls</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose which settings will save data in your MailG Account.</Typography>
                      </Box>

                      <OutlinedPanel>
                        <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Timeline</Typography>
                        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                          Helps you go back in time, and remember where you’ve been.
                          <Link href="#" underline="hover"> Learn more</Link>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography>OFF</Typography>
                          <FormGroup>
                            <FormControlLabel control={<Switch />} label="Turn on" />
                          </FormGroup>
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mt: 1 }}>Off by default when you created your account</Typography>

                        <Divider sx={{ my: 2 }} />
                        <Typography sx={{ fontSize: '0.95rem', mb: 1 }}>Subsettings</Typography>
                        <FormGroup>
                          <FormControlLabel control={<Switch defaultChecked />} label="Share Timeline edits and related data to improve your experience" />
                        </FormGroup>

                        <Typography sx={{ fontSize: '0.95rem', mt: 3, mb: 1 }}>Auto-delete (Not applicable)</Typography>
                        <Button sx={{ justifyContent: 'space-between', textTransform: 'none', width: '100%' }}>
                          <Typography>Turn on Timeline to choose an auto-delete option</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Button>
                      </OutlinedPanel>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }}>
                          See all activity controls
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'searchPersonalizationControls' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Search personalization</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Choose whether Search can show you personalized experiences based on saved data</Typography>
                      </Box>

                      <OutlinedPanel>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '1rem' }}>Personalize Search</Typography>
                          <Switch checked={!!privacySettings.personalizationEnabled} onChange={toggle('personalizationEnabled')} />
                        </Box>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 1 }}>
                          You get personalized versions of things like Discover stories, movie recommendations, and auto-complete suggestions.
                        </Typography>
                      </OutlinedPanel>

                      <Box sx={{ mt: 3 }}>
                        <Typography sx={{ fontSize: '1.25rem', mb: 2 }}>Your Search data</Typography>
                        <OutlinedPanel sx={{ p: 0 }}>
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Search history</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Liked</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Following</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Not interested</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                          <Divider />
                          <Button sx={{ justifyContent: 'space-between', textTransform: 'none', py: 2, px: 2, width: '100%' }}>
                            <Typography>Streaming preferences</Typography>
                            <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                          </Button>
                        </OutlinedPanel>
                      </Box>

                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button onClick={() => setActiveView('dataAndPrivacy')} sx={{ textTransform: 'none', color: '#1a73e8' }}>
                          Back to Data & privacy
                        </Button>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}

              {activeView === 'myAdCenter' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Personalized ads</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Simply turn off info you don't want used to personalize your ads.</Typography>
                      </Box>

                      {/* Top toggle row */}
                      <OutlinedPanel sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 500 }}>Personalized ads</Typography>
                        <FormGroup>
                          <FormControlLabel control={<Switch checked={!!privacySettings.adsPersonalizationEnabled} onChange={toggle('adsPersonalizationEnabled')} />} label={privacySettings.adsPersonalizationEnabled ? 'On' : 'Off'} />
                        </FormGroup>
                      </OutlinedPanel>

                      {/* Your account info tiles */}
                      <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Your MailG Account info</Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                        These details are used to personalize ads based on info you've shared or that's been guessed.
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                          <OutlinedPanel>
                            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>Age</Typography>
                            <Typography sx={{ fontSize: '0.95rem' }}>25-34 years</Typography>
                          </OutlinedPanel>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <OutlinedPanel>
                            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>Language</Typography>
                            <Typography sx={{ fontSize: '0.95rem' }}>English</Typography>
                          </OutlinedPanel>
                        </Grid>
                      </Grid>

                      {/* Categories used to show you ads */}
                      <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Categories used to show you ads</Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                        You may see ads meant for people in these categories, which are based on your MailG activity.
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        {['Relationships', 'Education', 'Industry', 'Employer Size'].map((label, idx) => (
                          <Grid key={idx} item xs={12} sm={6} md={3}>
                            <OutlinedPanel>
                              <Typography sx={{ fontSize: '0.9rem' }}>{label}</Typography>
                              <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>On</Typography>
                            </OutlinedPanel>
                          </Grid>
                        ))}
                      </Grid>

                      {/* Activity used to personalize ads */}
                      <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>Activity used to personalize ads</Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.875rem' }}>
                        Things you do on MailG sites and apps may be used to personalize ads you see.
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <OutlinedPanel sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>Web & App Activity</Typography>
                            <Typography sx={{ color: 'text.secondary' }}>On</Typography>
                          </OutlinedPanel>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <OutlinedPanel sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography>Areas where you’ve used Google</Typography>
                            <Typography sx={{ color: 'text.secondary' }}>On</Typography>
                          </OutlinedPanel>
                        </Grid>
                      </Grid>

                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mt: 3 }}>
                        <ShieldOutlinedIcon sx={{ color: '#1a73e8', mt: 0.25 }} />
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                          We protect your privacy. Content from CloudVault, MailG, and other services is never used for any ads purposes.
                        </Typography>
                      </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}
              {activeView === 'personalInfo' && (
                <Box>
                  <CenterColumn>
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Typography sx={{ fontSize: '1.5rem', mb: 1 }}>Personal info</Typography>
                        <Typography sx={{ color: 'text.secondary' }}>Info about you and your preferences across MailG services</Typography>
                      </Box>

                      {/* Basic info */}
                      <Card>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography sx={{ fontSize: '1rem' }}>Basic info</Typography>
                        <Link href="#" underline="hover" sx={{ fontSize: '0.75rem' }}>Learn more</Link>
                      </Box>
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mb: 2 }}>Some info may be visible to other people using MailG services.</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Name</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem' }}>Daye Onilla</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Birthday</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem' }}>March 8, 1993</Typography>
                          <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                        <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Gender</Typography>
                        <Typography sx={{ fontSize: '0.875rem' }}>Rather not say</Typography>
                      </Box>
                    </Box>
                  </Card>

                  {/* Contact info */}
                  <Box sx={{ mt: 3 }}>
                    <Card>
                      <Box sx={{ p: 2 }}>
                        <Typography sx={{ fontSize: '1rem', mb: 1 }}>Contact info</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Email</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography sx={{ fontSize: '0.875rem' }}>dayeonilla3k@mailg.com</Typography>
                            <Typography sx={{ fontSize: '0.875rem' }}>peterg24@mailg.com</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Phone</Typography>
                          <Typography sx={{ fontSize: '0.875rem' }}>0728 752846</Typography>
                        </Box>
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ fontSize: '0.875rem', mb: 1 }}>More options</Typography>
                          <Button variant="outlined" startIcon={<MailOutlineIcon />} sx={{ textTransform: 'none', borderRadius: 2 }}>
                            Manage emails from MailG
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Box>

                  {/* Addresses */}
                  <Box sx={{ mt: 3 }}>
                    <Card>
                      <Box sx={{ p: 2 }}>
                        <Typography sx={{ fontSize: '1rem', mb: 1 }}>Addresses</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem', mb: 2 }}>
                          Manage addresses associated with your MailG Account. <Link href="#" underline="hover">Learn more about addresses saved to your account</Link>
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Home</Typography>
                          <Typography sx={{ fontSize: '0.875rem' }}>Kilima Apartments Pangani, Mbono Rd, Nairobi</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Work</Typography>
                          <Typography sx={{ fontSize: '0.875rem' }}>Not set</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5, borderTop: '1px solid #eee' }}>
                          <Typography sx={{ color: 'text.secondary', width: { xs: '40%', md: '25%' }, fontSize: '0.875rem' }}>Other</Typography>
                          <Typography sx={{ fontSize: '0.875rem' }}>Other addresses you added</Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Box>
                    </Box>
                  </CenterColumn>
                </Box>
              )}
            </Box>
          </Box>
        </Container>
      </Box>
    </Dialog>
  );
}


